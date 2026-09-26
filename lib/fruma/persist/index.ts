import { join } from "node:path";
import type { FrumaVersion } from "../versions";
import { DEMO_SURFACE, TEST_SURFACE } from "../surfaces";
import { FileSpineStore } from "./file-store";
import { PostgresSpineStore } from "./postgres-store";
import type { SpineStore } from "./types";

export type {
  AnonymousMillRequest,
  MillConfirmation,
  PersistedDepositPointer,
  PersistedHeaderMap,
  SpineSnapshot,
  SpineStore,
} from "./types";
export { FileSpineStore } from "./file-store";
export { PostgresSpineStore } from "./postgres-store";

const stores = new Map<string, SpineStore>();
let testOverride: SpineStore | null = null;

function fileRootFor(surface: FrumaVersion): string {
  const base = process.env.FRUMA_DATA_DIR?.trim();
  if (base) return join(base, surface);
  return join(process.cwd(), ".data", `fruma-${surface}`);
}

/**
 * File store by default (`.data/fruma-{surface}` or `FRUMA_DATA_DIR/{surface}`).
 * Set DATABASE_URL to use Postgres for the same spine shapes (shared tables,
 * surface carried on header-map rows / deposit pointers).
 */
export function getSpineStore(surface: FrumaVersion = TEST_SURFACE): SpineStore {
  if (testOverride) return testOverride;
  const key = process.env.DATABASE_URL?.trim() ? `pg:${surface}` : `file:${surface}`;
  let store = stores.get(key);
  if (store) return store;
  if (process.env.DATABASE_URL?.trim()) {
    store = new PostgresSpineStore();
  } else {
    store = new FileSpineStore(fileRootFor(surface));
  }
  stores.set(key, store);
  return store;
}

/** Tests / wedge reset — swap the active store (all surfaces). */
export function setSpineStoreForTests(store: SpineStore | null) {
  testOverride = store;
  if (!store) stores.clear();
}

export function spineBackendKind(): "file" | "postgres" {
  return process.env.DATABASE_URL?.trim() ? "postgres" : "file";
}

export function defaultSurfaceForPersist(): FrumaVersion {
  return process.env.FRUMA_PERSIST_SURFACE === "demo" ? DEMO_SURFACE : TEST_SURFACE;
}
