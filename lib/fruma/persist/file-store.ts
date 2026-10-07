import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ProductTruthRecord } from "../product-truth";
import {
  conflictingDeposit,
  depositIdempotencyException,
  IdempotencyException,
} from "./idempotency";
import type {
  AnonymousMillRequest,
  MillConfirmation,
  PersistedCellMutation,
  PersistedDepositPointer,
  PersistedHeaderMap,
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
  readonly kind = "file" as const;
  private readonly root: string;
  private readonly objectsDir: string;
  private readonly metaPath: string;

  constructor(root = defaultDataDir()) {
    this.root = root;
    this.objectsDir = join(root, "objects");
    this.metaPath = join(root, "spine.json");
    mkdirSync(this.objectsDir, { recursive: true });
  }

  async load(): Promise<SpineSnapshot> {
    const snap = await this.readAll();
    return {
      ...snap,
      headerMaps: latestBy(snap.headerMaps, (row) => row.surface),
      requests: latestBy(snap.requests, (row) => row.id),
      confirmations: latestBy(snap.confirmations, (row) => row.id),
      productTruth: latestBy(snap.productTruth, (row) => row.productId),
    };
  }

  private async readAll(): Promise<SpineFile> {
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
    };
  }

  private async write(next: SpineFile): Promise<void> {
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
    const objectPath = join(this.objectsDir, pointer.objectKey);
    mkdirSync(join(objectPath, ".."), { recursive: true });
    writeFileSync(objectPath, bytes);
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
    const objectPath = join(this.objectsDir, pointer.objectKey);
    if (!existsSync(objectPath)) return null;
    return new Uint8Array(readFileSync(objectPath));
  }

  async reset(): Promise<void> {
    if (existsSync(this.root)) rmSync(this.root, { recursive: true, force: true });
    mkdirSync(this.objectsDir, { recursive: true });
  }
}
