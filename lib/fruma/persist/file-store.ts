import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type {
  AnonymousMillRequest,
  MillConfirmation,
  PersistedDepositPointer,
  PersistedHeaderMap,
  SpineSnapshot,
  SpineStore,
} from "./types";
import type { ProductTruthRecord } from "../product-truth";

const EMPTY: SpineSnapshot = {
  headerMaps: [],
  requests: [],
  confirmations: [],
  productTruth: [],
  deposits: [],
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
    const objectPath = join(this.objectsDir, pointer.objectKey);
    mkdirSync(join(objectPath, ".."), { recursive: true });
    writeFileSync(objectPath, bytes);
    const snap = await this.load();
    const idx = snap.deposits.findIndex((d) => d.depositId === pointer.depositId);
    if (idx === -1) snap.deposits.push(pointer);
    else snap.deposits[idx] = pointer;
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
