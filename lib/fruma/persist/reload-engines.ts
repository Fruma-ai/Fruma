import { isStandardField } from "../ingest/types";
import { restoreHeaderOverlays } from "../intelligence/overlays";
import type { ProductTruthRecord } from "../product-truth";
import { isFrumaVersion, FRUMA_VERSION_IDS, type FrumaVersion } from "../versions";
import { ledgerSchemaName, postgresLedgerSchema, searchPathStatement } from "./postgres-schema";
import type { PersistedHeaderMap } from "./types";

/**
 * A Postgres client already sitting on the environment search path.
 * `postgres` clients satisfy this.
 */
export type Client = {
  unsafe(
    query: string,
    parameters?: readonly unknown[],
  ): PromiseLike<readonly Record<string, unknown>[]>;
};

export type ActiveEngineCache = {
  headerMaps: PersistedHeaderMap[];
  productTruth: ProductTruthRecord[];
};

const caches = new Map<FrumaVersion, ActiveEngineCache>();

const LATEST_HEADER_MAPS_SQL = `
SELECT surface, overlays, updated_at, version
FROM fruma_header_maps AS h
WHERE h.is_active = TRUE
  AND h.version = (
    SELECT MAX(version)
    FROM fruma_header_maps AS m
    WHERE m.surface = h.surface
      AND m.is_active = TRUE
  )
`;

const LATEST_PRODUCT_TRUTH_SQL = `
SELECT product_id, version, payload
FROM fruma_product_truth AS h
WHERE h.is_active = TRUE
  AND h.version = (
    SELECT MAX(version)
    FROM fruma_product_truth AS m
    WHERE m.product_id = h.product_id
      AND m.is_active = TRUE
  )
`;

export function activeEngineCache(surface: FrumaVersion): ActiveEngineCache {
  const cache = caches.get(surface);
  return {
    headerMaps: [...(cache?.headerMaps ?? [])],
    productTruth: [...(cache?.productTruth ?? [])],
  };
}

export function resetEngineCacheForTests() {
  caches.clear();
}

/**
 * Load the latest active header maps and product-truth documents on the
 * client's search path into the in-memory engine cache.
 */
export async function reloadEnginesFromDatabase(client: Client): Promise<ActiveEngineCache> {
  const schemaRows = await client.unsafe(`SELECT current_schema() AS schema_name`);
  const schemaName = String(schemaRows[0]?.schema_name ?? "");
  const version = schemaName.startsWith("fruma_") ? schemaName.slice("fruma_".length) : "";
  if (!isFrumaVersion(version)) {
    throw new Error(`search_path schema ${schemaName || "(none)"} is not a Fruma ledger schema`);
  }

  const [mapRows, truthRows] = await Promise.all([
    client.unsafe(LATEST_HEADER_MAPS_SQL),
    client.unsafe(LATEST_PRODUCT_TRUTH_SQL),
  ]);

  const headerMaps: PersistedHeaderMap[] = [];
  for (const row of mapRows) {
    const surface = String(row.surface ?? "");
    const overlays = recordOfStrings(row.overlays);
    if (isFrumaVersion(surface)) restoreHeaderOverlays(surface, overlays);
    headerMaps.push({
      surface,
      overlays: standardOverlays(overlays),
      updatedAt: new Date(row.updated_at as string | Date).toISOString(),
    });
  }

  const productTruth: ProductTruthRecord[] = [];
  for (const row of truthRows) {
    const parsed = productTruthFromPayload(row.payload);
    if (!parsed) continue;
    const versionNumber = Number(row.version);
    productTruth.push({
      ...parsed,
      version: Number.isInteger(versionNumber) && versionNumber >= 1 ? versionNumber : parsed.version,
    });
  }

  const cache = { headerMaps, productTruth };
  caches.set(version, cache);
  return {
    headerMaps: [...headerMaps],
    productTruth: [...productTruth],
  };
}

/** Open each environment schema and restore its active engine cache. No-op without DATABASE_URL. */
export async function bootstrapEnginesFromDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;
  const postgres = (await import("postgres")).default;
  for (const version of FRUMA_VERSION_IDS) {
    const schema = ledgerSchemaName(version);
    const sql = postgres(url, {
      max: 1,
      prepare: false,
      connection: { options: `-c search_path=${schema}` },
    });
    try {
      await sql.unsafe(searchPathStatement(version));
      await sql.unsafe(postgresLedgerSchema(schema));
      await reloadEnginesFromDatabase(sql);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
}

function recordOfStrings(value: unknown): Record<string, string> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Record<string, string> = {};
  for (const [key, field] of Object.entries(parsed)) {
    if (typeof field === "string") out[key] = field;
  }
  return out;
}

function standardOverlays(overlays: Record<string, string>): PersistedHeaderMap["overlays"] {
  const next: PersistedHeaderMap["overlays"] = {};
  for (const [header, field] of Object.entries(overlays)) {
    const key = header.trim().toLowerCase();
    if (!key || !isStandardField(field)) continue;
    next[key] = field;
  }
  return next;
}

function productTruthFromPayload(value: unknown): ProductTruthRecord | null {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Partial<ProductTruthRecord>;
  if (typeof record.productId !== "string" || !Array.isArray(record.facts)) return null;
  return {
    productId: record.productId,
    version: typeof record.version === "number" ? record.version : 1,
    facts: record.facts,
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
    lockedSourceId: record.lockedSourceId,
  };
}
