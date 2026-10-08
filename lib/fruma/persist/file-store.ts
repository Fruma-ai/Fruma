import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertFileSpineRootAllowed } from "./configuration";
import { isStandardField } from "../ingest/types";
import type { ProductTruthRecord } from "../product-truth";
import {
  assertEmbeddingVector,
  assertMaterialEmbedding,
  cosineDistance,
  MATERIAL_SEARCH_CANDIDATE_LIMIT,
} from "./embeddings";
import {
  conflictingDeposit,
  depositIdempotencyException,
  IdempotencyException,
} from "./idempotency";
import type {
  AnonymousMillRequest,
  MillConfirmation,
  PersistedCellMutation,
  DepositAuditRow,
  PersistedDepositPointer,
  PersistedHeaderMap,
  ActiveProductTruthEvidence,
  JoinedSourceCell,
  MaterialSearchHit,
  PersistedMaterialEmbedding,
  PersistedNamedGrant,
  PersistedSourceCell,
  SpineSnapshot,
  SpineStore,
} from "./types";

type HeaderRevision = PersistedHeaderMap & { version: number };
type RequestRevision = AnonymousMillRequest & { version: number };
type ConfirmationRevision = MillConfirmation & { version: number };

type SpineFile = {
  headerMaps: HeaderRevision[];
  requests: RequestRevision[];
  confirmations: ConfirmationRevision[];
  productTruth: ProductTruthRecord[];
  deposits: PersistedDepositPointer[];
  sourceCells: PersistedSourceCell[];
  namedGrants: PersistedNamedGrant[];
  cellMutations: PersistedCellMutation[];
  materialEmbeddings: PersistedMaterialEmbedding[];
};

const EMPTY: SpineFile = {
  headerMaps: [],
  requests: [],
  confirmations: [],
  productTruth: [],
  deposits: [],
  sourceCells: [],
  namedGrants: [],
  cellMutations: [],
  materialEmbeddings: [],
};

function revisionOf(version: number | undefined): number {
  return Number.isInteger(version) && (version as number) >= 1 ? (version as number) : 1;
}

function nextVersion(rows: { version: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.version), 0) + 1;
}

function latestBy<T extends { version: number }>(rows: T[], key: (row: T) => string): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const id = key(row);
    const prev = best.get(id);
    if (!prev || row.version > prev.version) best.set(id, row);
  }
  return [...best.values()];
}

function defaultDataDir(): string {
  return process.env.FRUMA_DATA_DIR?.trim() || join(process.cwd(), ".data", "fruma-test");
}

export class FileSpineStore implements SpineStore {
  readonly kind: "file" | "memory";
  private readonly root: string;
  private readonly objectsDir: string;
  private readonly metaPath: string;
  private memorySnap: SpineFile | null = null;
  private memoryObjects: Map<string, Uint8Array> | null = null;

  /** Schema rows kept in the process. Nothing is written under `.data/`. */
  static memory(): FileSpineStore {
    return new FileSpineStore("", true);
  }

  constructor(root = defaultDataDir(), memory = false) {
    if (memory) {
      this.kind = "memory";
      this.root = "";
      this.objectsDir = "";
      this.metaPath = "";
      this.memorySnap = structuredClone(EMPTY);
      this.memoryObjects = new Map();
      return;
    }
    this.kind = "file";
    assertFileSpineRootAllowed(root);
    this.root = root;
    this.objectsDir = join(root, "objects");
    this.metaPath = join(root, "spine.json");
    mkdirSync(this.objectsDir, { recursive: true });
  }

  /** Every stored revision. Used by tests that read a schema without opening a directory. */
  documentRevisions(): SpineFile {
    if (this.kind !== "memory" || !this.memorySnap) {
      throw new Error("document revisions are available on the in-memory schema store");
    }
    return structuredClone(this.memorySnap);
  }

  async load(): Promise<SpineSnapshot> {
    const snap = await this.readAll();
    return {
      headerMaps: latestBy(snap.headerMaps, (row) => row.surface),
      requests: latestBy(snap.requests, (row) => row.id),
      confirmations: latestBy(snap.confirmations, (row) => row.id),
      productTruth: latestBy(snap.productTruth, (row) => row.productId),
      deposits: snap.deposits,
      sourceCells: snap.sourceCells,
      namedGrants: snap.namedGrants,
      cellMutations: snap.cellMutations,
    };
  }

  private async readAll(): Promise<SpineFile> {
    if (this.kind === "memory") return structuredClone(this.memorySnap ?? EMPTY);
    if (!existsSync(this.metaPath)) return structuredClone(EMPTY);
    const raw = readFileSync(this.metaPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SpineFile>;
    return {
      headerMaps: (parsed.headerMaps ?? []).map((row) => ({ ...row, version: revisionOf(row.version) })),
      requests: (parsed.requests ?? []).map((row) => ({ ...row, version: revisionOf(row.version) })),
      confirmations: (parsed.confirmations ?? []).map((row) => ({
        ...row,
        version: revisionOf(row.version),
      })),
      productTruth: parsed.productTruth ?? [],
      deposits: parsed.deposits ?? [],
      sourceCells: (parsed.sourceCells ?? []).map((cell) => ({
        ...cell,
        normalizedValue: cell.normalizedValue ?? null,
      })),
      namedGrants: parsed.namedGrants ?? [],
      cellMutations: parsed.cellMutations ?? [],
      materialEmbeddings: parsed.materialEmbeddings ?? [],
    };
  }

  private async write(next: SpineFile): Promise<void> {
    if (this.kind === "memory") {
      this.memorySnap = structuredClone(next);
      return;
    }
    mkdirSync(this.root, { recursive: true });
    writeFileSync(this.metaPath, JSON.stringify(next, null, 2));
  }

  async saveHeaderMap(map: PersistedHeaderMap): Promise<void> {
    const snap = await this.readAll();
    const version = nextVersion(snap.headerMaps.filter((row) => row.surface === map.surface));
    snap.headerMaps.push({ ...map, version });
    await this.write(snap);
  }

  async saveRequest(request: AnonymousMillRequest): Promise<void> {
    const snap = await this.readAll();
    const version = nextVersion(snap.requests.filter((row) => row.id === request.id));
    snap.requests.push({ ...request, version });
    await this.write(snap);
  }

  async saveConfirmation(confirmation: MillConfirmation): Promise<void> {
    const snap = await this.readAll();
    const version = nextVersion(snap.confirmations.filter((row) => row.id === confirmation.id));
    snap.confirmations.push({ ...confirmation, version });
    await this.write(snap);
  }

  async saveProductTruth(record: ProductTruthRecord): Promise<void> {
    const snap = await this.readAll();
    for (const fact of record.facts) {
      if (fact.sourceType !== "mill-file" || fact.status === "missing") continue;
      if (!fact.sourceCellId || !fact.depositId) {
        throw new Error(`product_truth_source_cell_required:${fact.field}`);
      }
      const cell = snap.sourceCells.find((row) => row.id === fact.sourceCellId);
      if (!cell || cell.depositId !== fact.depositId) {
        throw new Error(
          `product_truth_cell_fk: ${fact.sourceCellId} is not a cell of deposit ${fact.depositId}`,
        );
      }
    }
    const version = nextVersion(snap.productTruth.filter((row) => row.productId === record.productId));
    snap.productTruth.push({
      ...record,
      version,
      facts: record.facts.map((fact) => ({ ...fact, version })),
    });
    await this.write(snap);
  }

  async saveDepositPointer(pointer: PersistedDepositPointer, bytes: Uint8Array): Promise<void> {
    const snap = await this.readAll();
    const incoming = { id: pointer.depositId, byteHash: pointer.sha256 };
    const conflict = conflictingDeposit(
      snap.deposits.map((row) => ({ id: row.depositId, byteHash: row.sha256 })),
      incoming,
    );
    if (conflict) throw depositIdempotencyException(conflict, incoming);
    if (this.kind === "memory") {
      this.memoryObjects?.set(pointer.objectKey, new Uint8Array(bytes));
    } else {
      const objectPath = join(this.objectsDir, pointer.objectKey);
      mkdirSync(join(objectPath, ".."), { recursive: true });
      writeFileSync(objectPath, bytes);
    }
    snap.deposits.push(pointer);
    await this.write(snap);
  }

  async saveSourceCells(cells: PersistedSourceCell[]): Promise<void> {
    if (!cells.length) return;
    const snap = await this.readAll();
    for (const cell of cells) {
      const slotTaken = snap.sourceCells.some(
        (row) =>
          row.id === cell.id ||
          (row.depositId === cell.depositId &&
            row.sheetName === cell.sheetName &&
            row.rowIndex === cell.rowIndex &&
            row.colIndex === cell.colIndex),
      );
      if (slotTaken) {
        throw new IdempotencyException(
          "source_cell",
          `Source cell ${cell.id} already exists. Source values are immutable.`,
          { id: cell.id, depositId: cell.depositId },
        );
      }
      const deposit = snap.deposits.find((row) => row.depositId === cell.depositId);
      if (!deposit) throw new Error(`Deposit ${cell.depositId} is not in the spine.`);
      snap.sourceCells.push(cell);
    }
    await this.write(snap);
  }

  async saveNamedGrant(grant: PersistedNamedGrant): Promise<void> {
    const snap = await this.readAll();
    if (snap.namedGrants.some((row) => row.id === grant.id)) {
      throw new IdempotencyException(
        "named_grant",
        `Named grant ${grant.id} already exists. Grants are immutable.`,
        { id: grant.id },
      );
    }
    snap.namedGrants.push(grant);
    await this.write(snap);
  }

  async appendCellMutation(event: PersistedCellMutation): Promise<void> {
    const snap = await this.readAll();
    if (snap.cellMutations.some((row) => row.eventId === event.eventId)) {
      throw new IdempotencyException(
        "cell_mutation",
        `Cell mutation ${event.eventId} already exists. Mutations are append-only.`,
        { eventId: event.eventId },
      );
    }
    if (!snap.sourceCells.some((cell) => cell.id === event.sourceCellId)) {
      throw new Error(`Source cell ${event.sourceCellId} is not in the spine.`);
    }
    snap.cellMutations.push(event);
    await this.write(snap);
  }

  async getDepositBytes(depositId: string): Promise<Uint8Array | null> {
    const snap = await this.load();
    const pointer = snap.deposits.find((d) => d.depositId === depositId);
    if (!pointer) return null;
    if (this.kind === "memory") {
      const stored = this.memoryObjects?.get(pointer.objectKey);
      return stored ? new Uint8Array(stored) : null;
    }
    const objectPath = join(this.objectsDir, pointer.objectKey);
    if (!existsSync(objectPath)) return null;
    return new Uint8Array(readFileSync(objectPath));
  }

  async listSourceCellsWithMutations(filter?: { depositId?: string }): Promise<JoinedSourceCell[]> {
    const snap = await this.readAll();
    const depositId = filter?.depositId?.trim();
    const cells = snap.sourceCells.filter((cell) => !depositId || cell.depositId === depositId);
    return cells.map((cell) => {
      const deposit = snap.deposits.find((row) => row.depositId === cell.depositId);
      const mutations = snap.cellMutations
        .filter((event) => event.sourceCellId === cell.id)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      return {
        cell,
        supplierOrgId: deposit?.supplierOrgId ?? "",
        mutations,
      };
    });
  }

  async latestActiveHeaderMap(surface: string): Promise<PersistedHeaderMap | null> {
    const snap = await this.readAll();
    const active = snap.headerMaps
      .filter((row) => row.surface === surface)
      .reduce<HeaderRevision | null>((best, row) => {
        if (!best || row.version > best.version) return row;
        return best;
      }, null);
    if (!active) return null;
    const overlays: PersistedHeaderMap["overlays"] = {};
    for (const [header, field] of Object.entries(active.overlays)) {
      const key = header.trim().toLowerCase();
      if (key && isStandardField(field)) overlays[key] = field;
    }
    return {
      surface: active.surface,
      overlays,
      updatedAt: active.updatedAt,
    };
  }

  async listDepositSourceCells(depositId: string): Promise<PersistedSourceCell[]> {
    const snap = await this.readAll();
    return snap.sourceCells
      .filter((cell) => cell.depositId === depositId)
      .sort(
        (a, b) =>
          a.sheetName.localeCompare(b.sheetName) ||
          a.rowIndex - b.rowIndex ||
          a.colIndex - b.colIndex,
      );
  }

  async listDepositAudit(): Promise<DepositAuditRow[]> {
    const snap = await this.readAll();
    return snap.deposits
      .map((row) => ({
        id: row.depositId,
        filename: row.filename,
        byte_hash: row.sha256,
        supplier_org_id: row.supplierOrgId,
        received_at: row.receivedAt,
      }))
      .sort((a, b) => a.received_at.localeCompare(b.received_at) || a.id.localeCompare(b.id));
  }

  async saveMaterialEmbedding(row: PersistedMaterialEmbedding): Promise<void> {
    assertMaterialEmbedding(row);
    const snap = await this.readAll();
    if (!snap.sourceCells.some((cell) => cell.id === row.sourceCellId)) {
      throw new Error(`Source cell ${row.sourceCellId} is not in the spine.`);
    }
    if (snap.materialEmbeddings.some((stored) => stored.id === row.id)) {
      throw new Error(`Material embedding ${row.id} already exists.`);
    }
    snap.materialEmbeddings.push({
      id: row.id,
      sourceCellId: row.sourceCellId,
      embedding: [...row.embedding],
      updatedAt: row.updatedAt,
    });
    await this.write(snap);
  }

  async searchMaterialEmbeddings(embedding: readonly number[]): Promise<MaterialSearchHit[]> {
    assertEmbeddingVector(embedding);
    const snap = await this.readAll();
    const bestByCell = new Map<string, number>();
    for (const stored of snap.materialEmbeddings) {
      const distance = cosineDistance(embedding, stored.embedding);
      const previous = bestByCell.get(stored.sourceCellId);
      if (previous == null || distance < previous) bestByCell.set(stored.sourceCellId, distance);
    }
    const nearest = [...bestByCell.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .slice(0, MATERIAL_SEARCH_CANDIDATE_LIMIT);
    const cellById = new Map(snap.sourceCells.map((cell) => [cell.id, cell]));
    const rowDistance = new Map<string, number>();
    for (const [cellId, distance] of nearest) {
      const cell = cellById.get(cellId);
      if (!cell) continue;
      const key = `${cell.depositId}\0${cell.sheetName}\0${cell.rowIndex}`;
      const previous = rowDistance.get(key);
      if (previous == null || distance < previous) rowDistance.set(key, distance);
    }
    const hits: MaterialSearchHit[] = [];
    const rows = [...rowDistance.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
    );
    for (const [key, distance] of rows) {
      const [depositId, sheetName, rowIndexRaw] = key.split("\0");
      const rowIndex = Number(rowIndexRaw);
      const supplierOrgId =
        snap.deposits.find((deposit) => deposit.depositId === depositId)?.supplierOrgId ?? "";
      const rowCells = snap.sourceCells
        .filter(
          (cell) =>
            cell.depositId === depositId &&
            cell.sheetName === sheetName &&
            cell.rowIndex === rowIndex,
        )
        .sort((a, b) => a.colIndex - b.colIndex);
      for (const cell of rowCells) {
        const mutations = snap.cellMutations
          .filter((event) => event.sourceCellId === cell.id)
          .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        hits.push({
          cell,
          supplierOrgId,
          mutations,
          cosineDistance: distance,
          historicalArticles: [],
        });
      }
    }
    return hits;
  }

  async listActiveProductTruthEvidence(): Promise<ActiveProductTruthEvidence[]> {
    const snap = await this.readAll();
    const latest = new Map<string, (typeof snap.productTruth)[number]>();
    for (const row of snap.productTruth) {
      const previous = latest.get(row.productId);
      if (!previous || row.version > previous.version) latest.set(row.productId, row);
    }
    return [...latest.values()].map((record) => ({
      productId: record.productId,
      version: record.version,
      facts: record.facts.map((fact) => ({
        id: fact.id,
        field: fact.field,
        sourceType: fact.sourceType,
        sourceCellId: fact.sourceCellId ?? null,
        depositId: fact.depositId ?? null,
        evidenceId: fact.evidenceId ?? null,
        status: fact.status ?? null,
        confirmedBy: fact.confirmedBy ?? null,
        confirmedAt: fact.confirmedAt ?? null,
      })),
      evidence: record.evidence ?? [],
    }));
  }

  async reset(): Promise<void> {
    if (this.kind === "memory") {
      this.releaseVolatile();
      return;
    }
    await this.write(structuredClone(EMPTY));
  }

  /**
   * Drop schema rows and deposit bytes held in this process.
   * A fresh empty buffer replaces them so the pinned schema stays off disk.
   */
  releaseVolatile(): void {
    if (this.kind !== "memory") return;
    const held = this.memoryObjects;
    this.memorySnap = null;
    this.memoryObjects = null;
    held?.clear();
    this.memorySnap = structuredClone(EMPTY);
    this.memoryObjects = new Map();
  }
}
