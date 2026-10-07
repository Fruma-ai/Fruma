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
  "fruma_named_grants",
  "fruma_cell_mutation_events",
  "fruma_product_truth_facts",
] as const;

/**
 * Immutable ledger DDL for one environment schema.
 * Deposits, source cells, named grants, mutation events, and fact rows are insert-only.
 * `fruma_deposits.bytes` is the raw file. Nothing in this script updates it.
 * Isolation is the schema (`fruma_demo`, `fruma_test`, `fruma_production`).
 */
export function postgresLedgerSchema(targetSchema: string): string {
  const schema = assertLedgerSchema(targetSchema);
  const rel = (table: (typeof LEDGER_TABLES)[number] | "fruma_product_truth_provenance") =>
    `${schema}.${table}`;

  return `
CREATE SCHEMA IF NOT EXISTS ${schema};
SET search_path TO ${schema};
CREATE TABLE IF NOT EXISTS ${rel("fruma_header_maps")} (
  surface TEXT NOT NULL,
  overlays JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (surface)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_mill_requests")} (
  id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_mill_confirmations")} (
  id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS ${rel("fruma_product_truth")} (
  product_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (product_id, version)
);
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
  WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE ${rel("fruma_source_cells")} ADD COLUMN IF NOT EXISTS normalized_value TEXT;
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
  return null;
}
