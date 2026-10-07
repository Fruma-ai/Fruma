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

const EMPTY: SpineSnapshot = {
  headerMaps: [],
  requests: [],
  confirmations: [],
  productTruth: [],
  deposits: [],
  sourceCells: [],
  namedGrants: [],
  cellMutations: [],
};

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
    if (!existsSync(this.metaPath)) return structuredClone(EMPTY);
    const raw = readFileSync(this.metaPath, "utf8");
    const parsed = JSON.parse(raw) as SpineSnapshot;
    return {
      headerMaps: parsed.headerMaps ?? [],
      requests: parsed.requests ?? [],
      confirmations: parsed.confirmations ?? [],
      productTruth: parsed.productTruth ?? [],
      deposits: parsed.deposits ?? [],
      sourceCells: parsed.sourceCells ?? [],
      namedGrants: parsed.namedGrants ?? [],
      cellMutations: parsed.cellMutations ?? [],
    };
  }

  private async write(next: SpineSnapshot): Promise<void> {
    mkdirSync(this.root, { recursive: true });
    writeFileSync(this.metaPath, JSON.stringify(next, null, 2));
  }

  async saveHeaderMap(map: PersistedHeaderMap): Promise<void> {
    const snap = await this.load();
    const idx = snap.headerMaps.findIndex((m) => m.surface === map.surface);
    if (idx === -1) snap.headerMaps.push(map);
    else snap.headerMaps[idx] = map;
    await this.write(snap);
  }

  async saveRequest(request: AnonymousMillRequest): Promise<void> {
    const snap = await this.load();
    const idx = snap.requests.findIndex((r) => r.id === request.id);
    if (idx === -1) snap.requests.push(request);
    else snap.requests[idx] = request;
    await this.write(snap);
  }

  async saveConfirmation(confirmation: MillConfirmation): Promise<void> {
    const snap = await this.load();
    const idx = snap.confirmations.findIndex((c) => c.id === confirmation.id);
    if (idx === -1) snap.confirmations.push(confirmation);
    else snap.confirmations[idx] = confirmation;
    await this.write(snap);
  }

  async saveProductTruth(record: ProductTruthRecord): Promise<void> {
    const snap = await this.load();
    const idx = snap.productTruth.findIndex(
      (r) => r.productId === record.productId && r.version === record.version,
    );
    if (idx === -1) snap.productTruth.push(record);
    else snap.productTruth[idx] = record;
    await this.write(snap);
  }

  async saveDepositPointer(pointer: PersistedDepositPointer, bytes: Uint8Array): Promise<void> {
    const snap = await this.load();
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
    const snap = await this.load();
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
    const snap = await this.load();
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
    const snap = await this.load();
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
