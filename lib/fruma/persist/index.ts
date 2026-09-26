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

let singleton: SpineStore | null = null;

/**
 * File store by default (survives process restart under FRUMA_DATA_DIR / .data/fruma-test).
 * Set DATABASE_URL to use Postgres for the same spine shapes.
 */
export function getSpineStore(): SpineStore {
  if (singleton) return singleton;
  if (process.env.DATABASE_URL?.trim()) {
    singleton = new PostgresSpineStore();
  } else {
    singleton = new FileSpineStore();
  }
  return singleton;
}

/** Tests / pilot reset — swap the singleton. */
export function setSpineStoreForTests(store: SpineStore | null) {
  singleton = store;
}

export function spineBackendKind(): "file" | "postgres" {
  return process.env.DATABASE_URL?.trim() ? "postgres" : "file";
}
