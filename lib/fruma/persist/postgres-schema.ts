import { FIELD_CLASSES, STANDARD_FIELDS } from "../ingest/types";
import { FRUMA_VERSION_IDS, isFrumaVersion, type FrumaVersion } from "../versions";

/** Application environment. Each one owns a PostgreSQL schema. */
export const SURFACE_ENVIRONMENTS = FRUMA_VERSION_IDS;
export type SurfaceEnvironment = FrumaVersion;

export const LEDGER_SCHEMAS = {
  demo: "fruma_demo",
  test: "fruma_test",
  production: "fruma_production",
} as const satisfies Record<FrumaVersion, `fruma_${FrumaVersion}`>;
export type LedgerSchemaName = (typeof LEDGER_SCHEMAS)[keyof typeof LEDGER_SCHEMAS];

export function isSurfaceEnvironment(value: string): value is SurfaceEnvironment {
  return isFrumaVersion(value);
}

export function ledgerSchemaName(surface: SurfaceEnvironment): LedgerSchemaName {
  return LEDGER_SCHEMAS[surface];
}

/**
 * Session configuration for the pool that serves `version`.
 * The schema identifier is taken from {@link LEDGER_SCHEMAS}, never from raw input.
 */
export function searchPathStatement(version: string): string {
  if (!isFrumaVersion(version)) {
    throw new Error("version must be demo, test, or production");
  }
  return `SET search_path TO ${LEDGER_SCHEMAS[version]};`;
}

/**
 * Drop one environment schema and everything inside it.
 * The name is `fruma_` plus a closed FrumaVersion, taken from {@link LEDGER_SCHEMAS}.
 */
export function dropSchemaStatement(version: string): string {
  if (!isFrumaVersion(version)) {
    throw new Error("version must be demo, test, or production");
  }
  const schema = LEDGER_SCHEMAS[version];
  return `DROP SCHEMA IF EXISTS ${schema} CASCADE;`;
}

export function assertLedgerSchema(targetSchema: string): LedgerSchemaName {
  const allowed = Object.values(LEDGER_SCHEMAS) as readonly string[];
  if (!allowed.includes(targetSchema)) {
    throw new Error("targetSchema must be fruma_demo, fruma_test, or fruma_production");
  }
  return targetSchema as LedgerSchemaName;
}

const SCOPE_SQL = FIELD_CLASSES.map((field) => `'${field}'`).join(", ");
const STANDARD_FIELD_SQL = STANDARD_FIELDS.map((field) => `'${field}'`).join(", ");

export const LEDGER_TABLES = [
  "fruma_header_maps",
  "fruma_mill_requests",
  "fruma_mill_confirmations",
  "fruma_product_truth",
  "fruma_deposits",
  "fruma_source_cells",
  "fruma_material_embeddings",
  "fruma_named_grants",
  "fruma_cell_mutation_events",
  "fruma_product_truth_facts",
  "fruma_factory_profiles",
  "fruma_loom_capabilities",
  "fruma_search_telemetry",
  "fruma_staged_suggestions",
] as const;

/**
 * Immutable ledger DDL for one environment schema.
 * Every table is insert-only. Header maps, mill requests, mill confirmations,
 * and product-truth headers are versioned documents: the row id is a UUID,
 * and the business key is unique only together with `version`.
 * Active state is the greatest version for that key.
 * Factory profiles are versioned by mill. Loom capabilities belong to one profile row.
 * `fruma_search_telemetry` records anonymized design searches. It has no brand column.
 * `fruma_staged_suggestions` is the proposal buffer for the deterministic engine.
 * It lives in the same schema and is not a product-truth fact.
 * `fruma_deposits.bytes` is the raw file. Nothing in this script updates it.
 * Isolation is the schema (`fruma_demo`, `fruma_test`, `fruma_production`).
 */
export function postgresLedgerSchema(targetSchema: string): string {
  const schema = assertLedgerSchema(targetSchema);
  const rel = (table: (typeof LEDGER_TABLES)[number] | "fruma_product_truth_provenance") =>
    `${schema}.${table}`;

  return `
SET search_path TO public;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS ${schema};
SET search_path TO ${schema};
CREATE TABLE IF NOT EXISTS ${rel("fruma_header_maps")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL DEFAULT 'header_map' CHECK (document_type = 'header_map'),
  surface TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  overlays JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fruma_header_maps_surface_version_key UNIQUE (surface, version)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_mill_requests")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL DEFAULT 'mill_request' CHECK (document_type = 'mill_request'),
  request_id TEXT NOT NULL,
  mill_org_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  payload JSONB NOT NULL,
  CONSTRAINT fruma_mill_requests_request_version_key UNIQUE (request_id, version)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_mill_confirmations")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL DEFAULT 'mill_confirmation' CHECK (document_type = 'mill_confirmation'),
  confirmation_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  mill_org_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  payload JSONB NOT NULL,
  CONSTRAINT fruma_mill_confirmations_confirmation_version_key UNIQUE (confirmation_id, version)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_product_truth")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL DEFAULT 'product_truth' CHECK (document_type = 'product_truth'),
  product_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  payload JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fruma_product_truth_product_version_key UNIQUE (product_id, version)
);
ALTER TABLE ${rel("fruma_header_maps")} ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ${rel("fruma_product_truth")} ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS ${rel("fruma_deposits")} (
  id TEXT PRIMARY KEY,
  byte_hash TEXT NOT NULL,
  filename TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  supplier_org_id TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  CONSTRAINT fruma_deposits_byte_hash_key UNIQUE (byte_hash)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_source_cells")} (
  id TEXT PRIMARY KEY,
  deposit_id TEXT NOT NULL REFERENCES ${rel("fruma_deposits")} (id),
  sheet_name TEXT NOT NULL,
  row_index INTEGER NOT NULL CHECK (row_index >= 1),
  col_index INTEGER NOT NULL CHECK (col_index >= 1),
  raw_header TEXT NOT NULL,
  source_value TEXT NOT NULL,
  normalized_value TEXT,
  CONSTRAINT fruma_source_cells_slot_key UNIQUE (deposit_id, sheet_name, row_index, col_index),
  CONSTRAINT fruma_source_cells_id_deposit_key UNIQUE (id, deposit_id)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_named_grants")} (
  id TEXT PRIMARY KEY,
  mill_org_id TEXT NOT NULL,
  brand_org_id TEXT NOT NULL,
  scope_class TEXT NOT NULL CHECK (scope_class IN (${SCOPE_SQL})),
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_cell_mutation_events")} (
  event_id TEXT PRIMARY KEY,
  source_cell_id TEXT NOT NULL REFERENCES ${rel("fruma_source_cells")} (id),
  operator_cookie TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('map', 'confirm')),
  old_standard_value TEXT,
  new_standard_value TEXT,
  standard_field TEXT CHECK (
    standard_field IS NULL OR standard_field IN (${STANDARD_FIELD_SQL})
  ),
  occurred_at TIMESTAMPTZ NOT NULL
);
DO $$
BEGIN
  ALTER TABLE ${rel("fruma_source_cells")}
    ADD CONSTRAINT fruma_source_cells_id_deposit_key UNIQUE (id, deposit_id);
EXCEPTION
  WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
ALTER TABLE ${rel("fruma_source_cells")} ADD COLUMN IF NOT EXISTS normalized_value TEXT;
CREATE TABLE IF NOT EXISTS ${rel("fruma_material_embeddings")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_cell_id TEXT NOT NULL REFERENCES ${rel("fruma_source_cells")} (id) ON DELETE RESTRICT,
  embedding public.vector(1536) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE ${rel("fruma_material_embeddings")}
  DROP CONSTRAINT fruma_material_embeddings_source_cell_id_fkey,
  ADD CONSTRAINT fruma_material_embeddings_source_cell_id_fkey
    FOREIGN KEY (source_cell_id) REFERENCES ${rel("fruma_source_cells")} (id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS material_embedding_hnsw_idx
  ON ${rel("fruma_material_embeddings")}
  USING hnsw (embedding public.vector_cosine_ops);
CREATE TABLE IF NOT EXISTS ${rel("fruma_product_truth_facts")} (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  field TEXT NOT NULL,
  value TEXT,
  source_type TEXT NOT NULL,
  source_cell_id TEXT,
  deposit_id TEXT,
  CONSTRAINT fruma_product_truth_facts_deposit_fk
    FOREIGN KEY (deposit_id) REFERENCES ${rel("fruma_deposits")} (id),
  CONSTRAINT fruma_product_truth_facts_cell_fk
    FOREIGN KEY (source_cell_id, deposit_id)
    REFERENCES ${rel("fruma_source_cells")} (id, deposit_id),
  CONSTRAINT fruma_product_truth_facts_pair_chk CHECK (
    (source_cell_id IS NULL AND deposit_id IS NULL)
    OR (source_cell_id IS NOT NULL AND deposit_id IS NOT NULL)
  ),
  CONSTRAINT fruma_product_truth_facts_mill_file_chk CHECK (
    source_type <> 'mill-file'
    OR (source_cell_id IS NOT NULL AND deposit_id IS NOT NULL)
  ),
  CONSTRAINT fruma_product_truth_facts_version_fk
    FOREIGN KEY (product_id, version)
    REFERENCES ${rel("fruma_product_truth")} (product_id, version)
);
CREATE INDEX IF NOT EXISTS fruma_cell_mutation_events_cell_idx
  ON ${rel("fruma_cell_mutation_events")} (source_cell_id, occurred_at);
CREATE INDEX IF NOT EXISTS fruma_product_truth_facts_cell_idx
  ON ${rel("fruma_product_truth_facts")} (source_cell_id);
CREATE INDEX IF NOT EXISTS fruma_product_truth_facts_deposit_idx
  ON ${rel("fruma_product_truth_facts")} (deposit_id);
CREATE TABLE IF NOT EXISTS ${rel("fruma_factory_profiles")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_org_id TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  country_location TEXT NOT NULL,
  active_loom_count INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fruma_factory_profiles_mill_version_key UNIQUE (mill_org_id, version)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_loom_capabilities")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_profile_id UUID NOT NULL REFERENCES ${rel("fruma_factory_profiles")} (id) ON DELETE CASCADE,
  construction_type TEXT NOT NULL,
  min_gsm INTEGER NOT NULL,
  max_gsm INTEGER NOT NULL,
  max_usable_width_cm INTEGER NOT NULL,
  yarn_feed_compatibility JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);
CREATE INDEX IF NOT EXISTS fruma_loom_capabilities_profile_idx
  ON ${rel("fruma_loom_capabilities")} (factory_profile_id);
CREATE TABLE IF NOT EXISTS ${rel("fruma_search_telemetry")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id TEXT NOT NULL,
  requested_gsm INTEGER NOT NULL,
  requested_width_cm INTEGER NOT NULL,
  requested_fibers JSONB NOT NULL,
  result_count INTEGER NOT NULL CHECK (result_count >= 0),
  searched_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fruma_search_telemetry_fibers_chk CHECK (jsonb_typeof(requested_fibers) = 'array')
);
CREATE INDEX IF NOT EXISTS fruma_search_telemetry_zero_results_idx
  ON ${rel("fruma_search_telemetry")} (result_count, requested_gsm, requested_width_cm);
CREATE TABLE IF NOT EXISTS ${rel("fruma_staged_suggestions")} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id TEXT NOT NULL REFERENCES ${rel("fruma_deposits")} (id) ON DELETE CASCADE,
  source_cell_id TEXT NOT NULL REFERENCES ${rel("fruma_source_cells")} (id) ON DELETE RESTRICT,
  target_field TEXT NOT NULL CHECK (target_field IN (${STANDARD_FIELD_SQL})),
  suggested_value TEXT NOT NULL,
  derivation_source TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ${rel("fruma_staged_suggestions")}
  DROP CONSTRAINT fruma_staged_suggestions_source_cell_id_fkey,
  ADD CONSTRAINT fruma_staged_suggestions_source_cell_id_fkey
    FOREIGN KEY (source_cell_id) REFERENCES ${rel("fruma_source_cells")} (id) ON DELETE RESTRICT;
DO $$
DECLARE
  cascading text;
BEGIN
  SELECT string_agg(n.nspname || '.' || c.conname, ', ' ORDER BY c.conname)
    INTO cascading
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = rel.relnamespace
  WHERE c.contype = 'f'
    AND c.confdeltype = 'c'
    AND n.nspname = '${schema}'
    AND c.conname IN (
      'fruma_material_embeddings_source_cell_id_fkey',
      'fruma_staged_suggestions_source_cell_id_fkey'
    );
  IF cascading IS NOT NULL THEN
    RAISE EXCEPTION 'ON DELETE CASCADE is still set on %', cascading;
  END IF;
END $$;
CREATE OR REPLACE VIEW ${rel("fruma_product_truth_provenance")} AS
SELECT
  f.id AS fact_id,
  f.product_id,
  f.version,
  f.field,
  f.value,
  f.deposit_id,
  f.source_cell_id,
  d.filename AS deposit_filename,
  d.byte_hash,
  c.sheet_name,
  c.row_index,
  c.col_index,
  c.raw_header,
  c.source_value,
  c.normalized_value
FROM ${rel("fruma_product_truth_facts")} f
INNER JOIN ${rel("fruma_source_cells")} c
  ON c.id = f.source_cell_id
 AND c.deposit_id = f.deposit_id
INNER JOIN ${rel("fruma_deposits")} d
  ON d.id = f.deposit_id
 AND d.id = c.deposit_id;
`;
}

/**
 * Initialization must not ALTER a legacy JSONB or column-gated deposit table
 * into this ledger. Those rows were written with ON CONFLICT DO UPDATE.
 */
export function legacyLedgerMessage(columnsByTable: Map<string, Set<string>>): string | null {
  const deposits = columnsByTable.get("fruma_deposits");
  if (
    deposits &&
    (deposits.has("pointer") || deposits.has("surface_environment") || !deposits.has("byte_hash"))
  ) {
    return (
      "fruma_deposits is still the mutable JSONB spine or the surface_environment column gate. " +
      "Drop this schema's fruma_* tables before starting the schema-isolated ledger. " +
      "Initialization will not ALTER or overwrite those rows."
    );
  }
  for (const table of LEDGER_TABLES) {
    const cols = columnsByTable.get(table);
    if (!cols) continue;
    if (cols.has("surface_environment")) {
      return `${table} still has surface_environment. Drop this schema's fruma_* tables and reinitialize.`;
    }
  }
  for (const table of [
    "fruma_header_maps",
    "fruma_mill_requests",
    "fruma_mill_confirmations",
    "fruma_product_truth",
  ] as const) {
    const cols = columnsByTable.get(table);
    if (!cols) continue;
    if (!cols.has("id") || !cols.has("document_type") || !cols.has("version")) {
      return `${table} is still an upserted JSONB document. Drop this schema and reinitialize.`;
    }
  }
  return null;
}
