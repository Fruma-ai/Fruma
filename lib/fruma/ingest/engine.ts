import { randomUUID } from "node:crypto";
import {
  freezeSourceCell,
  resolveActiveCell,
  sourceCellId,
  type CellMutationEvent,
} from "./cell-mutations";
import { IngestException } from "./exceptions";
import { sha256Hex } from "./hash";
import { qualitiesFromCells } from "./identity";
import { parseMillBytes } from "./parse";
import { PrivateByteStore } from "./store";
import {
  DEFAULT_DENY_FIELD_CLASSES,
  FIELD_CLASS_OF,
  GRANT_STATUS_GRANTED,
  GRANT_STATUS_REVOKED,
  VISIBILITY_PRIVATE,
  type BaseQuality,
  type BrandVisibleQuality,
  type DepositResult,
  type FieldClass,
  type GrantActor,
  type NamedGrant,
  type SourceCell,
  type SourceExistsPointer,
  type StandardField,
} from "./types";
import { assertNamedGrantActor, brandView } from "./visibility";

export type DepositInput = {
  supplierOrgId: string;
  filename: string;
  bytes: Uint8Array;
  receivedAt?: string;
  headerOverlays?: Record<string, StandardField>;
};

export class IngestEngine {
  private readonly store: PrivateByteStore;
  private readonly cellsByDeposit = new Map<string, SourceCell[]>();
  private readonly qualities: BaseQuality[] = [];
  private readonly grants: NamedGrant[] = [];
  /** Append-only. mapCell and confirmCell never edit the deposited SourceCell. */
  private readonly mutations: CellMutationEvent[] = [];

  constructor(options?: { privateDir?: string }) {
    this.store = new PrivateByteStore(options?.privateDir);
  }

  deposit(input: DepositInput): DepositResult {
    const parsed = parseMillBytes(input.filename, input.bytes, input.headerOverlays);
    const cells = parsed.cells.map((cell) => freezeSourceCell(cell));
    const deposit = this.store.put({
      supplierOrgId: input.supplierOrgId,
      filename: input.filename,
      bytes: input.bytes,
      receivedAt: input.receivedAt,
    });
    this.cellsByDeposit.set(deposit.depositId, cells);
    const built = qualitiesFromCells({
      supplierOrgId: input.supplierOrgId,
      depositId: deposit.depositId,
      cells,
    });
    this.qualities.push(...built.qualities);
    return {
      deposit,
      parsed: true,
      cells,
      qualities: built.qualities,
      exceptions: built.exceptions,
    };
  }

  storedSha256(depositId: string): string {
    const privateBytes = this.store.getBytes(depositId);
    return sha256Hex(privateBytes.bytes);
  }

  millPrivateBytes(depositId: string): { bytes: Uint8Array; sha256: string } {
    const stored = this.store.getBytes(depositId);
    return { bytes: stored.bytes, sha256: stored.sha256 };
  }

  mapCell(
    depositId: string,
    pointer: { sheet: string; row: number; column: string },
    standardField: StandardField,
    standardValue?: string,
    operatorCookie = "",
  ): SourceCell {
    const cell = this.findCell(depositId, pointer);
    const active = this.activeCell(depositId, cell);
    const previous = active.standardValue ?? null;
    const next = standardValue !== undefined ? standardValue : previous;
    this.appendMutation({
      depositId,
      cell,
      actionType: "map",
      operatorCookie,
      standardField,
      oldStandardValue: previous,
      newStandardValue: next,
    });
    return this.activeCell(depositId, cell);
  }

  confirmCell(
    depositId: string,
    pointer: { sheet: string; row: number; column: string },
    operatorCookie = "",
  ): SourceCell {
    const cell = this.findCell(depositId, pointer);
    const active = this.activeCell(depositId, cell);
    const value = active.standardValue ?? null;
    this.appendMutation({
      depositId,
      cell,
      actionType: "confirm",
      operatorCookie,
      standardField: null,
      oldStandardValue: value,
      newStandardValue: value,
    });
    return this.activeCell(depositId, cell);
  }

  /** Events in append order. The deposited cells are not in this list. */
  cellMutationEvents(): readonly CellMutationEvent[] {
    return this.mutations.map((event) => ({ ...event }));
  }

  /** Certs only after an explicit mill confirm. Never inferred. */
  confirmCert(baseQualityId: string, valueAsWritten: string, operatorCookie = ""): void {
    const quality = this.qualities.find((q) => q.id === baseQualityId);
    if (!quality) {
      throw new IngestException("unknown_deposit", "BaseQuality is not in the ingest store.", {
        baseQualityId,
      });
    }
    const sourceCell = quality.cells.find(
      (c) => c.standardField === "cert" && c.sourceValue === valueAsWritten,
    );
    if (!sourceCell) {
      throw new IngestException(
        "uncertain_bytes",
        "Cert is not mill-sourced on this quality; ingest will not infer one.",
      );
    }
    const active = this.activeCell(quality.depositId, sourceCell);
    const value = active.standardValue ?? null;
    this.appendMutation({
      depositId: quality.depositId,
      cell: sourceCell,
      actionType: "confirm",
      operatorCookie,
      standardField: null,
      oldStandardValue: value,
      newStandardValue: value,
    });
    if (!quality.certs.some((c) => c.valueAsWritten === valueAsWritten)) {
      quality.certs.push({ valueAsWritten, sourceCell, millConfirmed: true });
    }
  }

  tryElevateVisibility(
    actor: GrantActor,
    reason: "operator_cookie" | "confidence" | "approve_all",
  ): never {
    assertNamedGrantActor(actor, "");
    throw new IngestException(
      "grant_denied",
      `${reason} cannot create Granted visibility.`,
    );
  }

  grant(input: {
    millOrgId: string;
    brandOrgId: string;
    objectIds: string[];
    fieldClass: FieldClass;
    actor: GrantActor;
  }): NamedGrant {
    assertNamedGrantActor(input.actor, input.millOrgId);
    if (!input.objectIds.length) {
      throw new IngestException("grant_denied", "Grant must name objects.");
    }
    const grant: NamedGrant = {
      grantId: randomUUID(),
      millOrgId: input.millOrgId,
      brandOrgId: input.brandOrgId,
      objectIds: [...input.objectIds],
      fieldClass: input.fieldClass,
      status: GRANT_STATUS_GRANTED,
    };
    this.grants.push(grant);
    return { ...grant, objectIds: [...grant.objectIds] };
  }

  /** Revoked is not current. Brand view must not keep showing this grant. */
  revoke(grantId: string): NamedGrant {
    const grant = this.grants.find((g) => g.grantId === grantId);
    if (!grant) {
      throw new IngestException("unknown_grant", "Grant is not in the ingest store.", {
        grantId,
      });
    }
    grant.status = GRANT_STATUS_REVOKED;
    return { ...grant, objectIds: [...grant.objectIds] };
  }

  grantById(grantId: string): NamedGrant {
    const grant = this.grants.find((g) => g.grantId === grantId);
    if (!grant) {
      throw new IngestException("unknown_grant", "Grant is not in the ingest store.", {
        grantId,
      });
    }
    return { ...grant, objectIds: [...grant.objectIds] };
  }

  millQualities(supplierOrgId: string): BaseQuality[] {
    return this.qualitiesWithActiveCells()
      .filter((q) => q.supplierOrgId === supplierOrgId)
      .map(cloneQuality);
  }

  brandVisibleRows(brandOrgId: string): BrandVisibleQuality[] {
    return brandView(brandOrgId, this.qualitiesWithActiveCells(), this.grants);
  }

  brandSourcePointer(brandOrgId: string, baseQualityId: string): SourceExistsPointer | null {
    const rows = this.brandVisibleRows(brandOrgId);
    const hit = rows.find((r) => r.baseQualityId === baseQualityId);
    return hit ? { exists: true } : null;
  }

  brandSourceBytes(brandOrgId: string, depositId: string): never {
    void brandOrgId;
    void depositId;
    throw new IngestException(
      "source_bytes_denied",
      "Brand may receive a source-exists pointer, never source bytes.",
    );
  }

  defaultDeniedClasses(): readonly FieldClass[] {
    return DEFAULT_DENY_FIELD_CLASSES;
  }

  fieldClassOf(field: StandardField): FieldClass {
    return FIELD_CLASS_OF[field];
  }

  private appendMutation(input: {
    depositId: string;
    cell: SourceCell;
    actionType: CellMutationEvent["actionType"];
    operatorCookie: string;
    standardField: StandardField | null;
    oldStandardValue: string | null;
    newStandardValue: string | null;
  }): CellMutationEvent {
    const event: CellMutationEvent = {
      eventId: randomUUID(),
      sourceCellId: sourceCellId(input.depositId, input.cell.pointer),
      operatorCookie: input.operatorCookie,
      actionType: input.actionType,
      oldStandardValue: input.oldStandardValue,
      newStandardValue: input.newStandardValue,
      standardField: input.standardField,
      occurredAt: new Date().toISOString(),
    };
    this.mutations.push(event);
    return event;
  }

  private activeCell(depositId: string, cell: SourceCell): SourceCell {
    const id = sourceCellId(depositId, cell.pointer);
    return resolveActiveCell(
      cell,
      this.mutations.filter((event) => event.sourceCellId === id),
    );
  }

  /** Brand and mill reads see replayed state. The stored quality still points at frozen source cells. */
  private qualitiesWithActiveCells(): BaseQuality[] {
    return this.qualities.map((quality) => ({
      ...quality,
      cells: quality.cells.map((cell) => this.activeCell(quality.depositId, cell)),
      colourways: quality.colourways.map((colourway) => ({
        ...colourway,
        sourceCell: this.activeCell(quality.depositId, colourway.sourceCell),
      })),
      widths: quality.widths.map((width) => ({
        ...width,
        sourceCell: this.activeCell(quality.depositId, width.sourceCell),
      })),
      certs: quality.certs.map((cert) => ({
        ...cert,
        sourceCell: this.activeCell(quality.depositId, cert.sourceCell),
      })),
    }));
  }

  private findCell(
    depositId: string,
    pointer: { sheet: string; row: number; column: string },
  ): SourceCell {
    const cells = this.cellsByDeposit.get(depositId);
    if (!cells) {
      throw new IngestException("unknown_deposit", "Deposit is not in the ingest store.", {
        depositId,
      });
    }
    const cell = cells.find(
      (c) =>
        c.pointer.sheet === pointer.sheet &&
        c.pointer.row === pointer.row &&
        c.pointer.column === pointer.column,
    );
    if (!cell) {
      throw new IngestException("unknown_deposit", "Cell pointer is not in this deposit.", {
        pointer,
      });
    }
    return cell;
  }
}

function cloneCell(cell: SourceCell): SourceCell {
  return {
    ...cell,
    pointer: { ...cell.pointer },
  };
}

function cloneQuality(q: BaseQuality): BaseQuality {
  return {
    ...q,
    colourways: q.colourways.map((c) => ({ ...c, sourceCell: cloneCell(c.sourceCell) })),
    widths: q.widths.map((w) => ({ ...w, sourceCell: cloneCell(w.sourceCell) })),
    cells: q.cells.map(cloneCell),
    certs: q.certs.map((c) => ({ ...c, sourceCell: cloneCell(c.sourceCell) })),
  };
}

export { VISIBILITY_PRIVATE };
