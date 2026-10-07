import { join } from "node:path";
import { isFrumaVersion, type FrumaVersion } from "../versions";
import { TEST_SURFACE } from "../surfaces";
import { MissingConfigurationException } from "./configuration";
import { FileSpineStore } from "./file-store";
import { clearPostgresSpineStoresForTests, postgresSpineStore } from "./postgres-store";
import type { SpineStore } from "./types";

export type {
  AnonymousMillRequest,
  DepositAuditRow,
  MillConfirmation,
  PersistedCellMutation,
  PersistedDepositPointer,
  PersistedHeaderMap,
  ActiveProductTruthEvidence,
  JoinedSourceCell,
  LinkedProductTruthFact,
  MaterialSearchHit,
  PersistedMaterialEmbedding,
  PersistedNamedGrant,
  PersistedSourceCell,
  SpineSnapshot,
  SpineStore,
} from "./types";
export { FileSpineStore } from "./file-store";
export { PostgresSpineStore } from "./postgres-store";
export { MissingConfigurationException, isMissingConfigurationException } from "./configuration";
export { IdempotencyException, isIdempotencyException } from "./idempotency";
export type { SurfaceEnvironment } from "./postgres-schema";

const stores = new Map<string, SpineStore>();
const schemaStores = new Map<FrumaVersion, SpineStore>();
let testOverride: SpineStore | null = null;

function fileRootFor(surface: FrumaVersion): string {
  const base = process.env.FRUMA_DATA_DIR?.trim();
  if (base) return join(base, surface);
  return join(process.cwd(), ".data", `fruma-${surface}`);
}

/**
 * Postgres when DATABASE_URL is set (`fruma_demo`, `fruma_test`, `fruma_production`).
 * Demo and test can use a file spine while that variable is unset.
 * Production requires DATABASE_URL and does not create a local folder.
 */
/** Pin one in-memory or Postgres store per environment. Pass null to clear. */
export function setSchemaStoresForTests(next: ReadonlyMap<FrumaVersion, SpineStore> | null): void {
  schemaStores.clear();
  if (!next) return;
  for (const [surface, store] of next) schemaStores.set(surface, store);
}

export function getSpineStore(surface: FrumaVersion = TEST_SURFACE): SpineStore {
  const pinned = schemaStores.get(surface);
  if (pinned) return pinned;
  if (testOverride) return testOverride;
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const key = databaseUrl ? `pg:${surface}` : `file:${surface}`;
  let store = stores.get(key);
  if (store) return store;
  if (databaseUrl) {
    store = postgresSpineStore(surface);
  } else if (surface === "production") {
    throw new MissingConfigurationException(
      "DATABASE_URL is required for the production ledger.",
    );
  } else {
    store = new FileSpineStore(fileRootFor(surface));
  }
  stores.set(key, store);
  return store;
}

/** Tests / wedge reset — swap the active store (all surfaces). */
export function setSpineStoreForTests(store: SpineStore | null) {
  testOverride = store;
  if (!store) {
    stores.clear();
    schemaStores.clear();
    clearPostgresSpineStoresForTests();
  }
}

export function spineBackendKind(): "file" | "postgres" {
  return process.env.DATABASE_URL?.trim() ? "postgres" : "file";
}

export function defaultSurfaceForPersist(): FrumaVersion {
  const configured = process.env.FRUMA_PERSIST_SURFACE;
  return isFrumaVersion(configured) ? configured : TEST_SURFACE;
}
