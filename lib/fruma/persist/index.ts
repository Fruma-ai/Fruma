import { join } from "node:path";
import { FRUMA_VERSION_IDS, isFrumaVersion, type FrumaVersion } from "../versions";
import { TEST_SURFACE } from "../surfaces";
import { MissingConfigurationException } from "./configuration";
import { FileSpineStore } from "./file-store";
import { clearPostgresSpineStoresForTests, postgresSpineStore } from "./postgres-store";
import { clearEngineCacheForVersion } from "./reload-engines";
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
export { executeTenantQuery, type TenantNamespace } from "./tenant-query";

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

function releaseMemorySpine(store: SpineStore | undefined): void {
  if (store instanceof FileSpineStore) store.releaseVolatile();
}

/**
 * Drop the in-memory schema for one version when no Postgres URL is configured.
 * A configured DATABASE_URL keeps the ledger on that schema's reset path.
 */
export async function clearVolatileTestSpine(version: string): Promise<void> {
  if (process.env.DATABASE_URL !== undefined) return;
  if (!isFrumaVersion(version)) return;
  const pinned = schemaStores.get(version);
  const cached = stores.get(`file:${version}`);
  releaseMemorySpine(pinned);
  if (cached !== pinned) releaseMemorySpine(cached);
  clearEngineCacheForVersion(version);
}

/** Tests / wedge reset — swap the active store (all surfaces). */
export function setSpineStoreForTests(store: SpineStore | null) {
  if (!store && process.env.DATABASE_URL === undefined) {
    releaseMemorySpine(testOverride ?? undefined);
    for (const version of FRUMA_VERSION_IDS) {
      const pinned = schemaStores.get(version);
      const cached = stores.get(`file:${version}`);
      if (pinned !== testOverride) releaseMemorySpine(pinned);
      if (cached !== pinned && cached !== testOverride) releaseMemorySpine(cached);
      clearEngineCacheForVersion(version);
    }
  }
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
