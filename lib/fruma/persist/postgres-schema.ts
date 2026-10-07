import { FIELD_CLASSES } from "../ingest/types";

/** Environment gate stored on every ledger table. */
export const SURFACE_ENVIRONMENTS = ["demo", "test", "production"] as const;
export type SurfaceEnvironment = (typeof SURFACE_ENVIRONMENTS)[number];

export function isSurfaceEnvironment(value: string): value is SurfaceEnvironment {
  return (SURFACE_ENVIRONMENTS as readonly string[]).includes(value);
}

const SURFACE_SQL = `TEXT NOT NULL CHECK (surface_environment IN ('demo', 'test', 'production'))`;

const SCOPE_SQL = FIELD_CLASSES.map((field) => `'${field}'`).join(", ");

/**
 * Immutable ledger DDL.
 * Deposits, source cells, and named grants are insert-only.
 * There is no ON CONFLICT DO UPDATE on those tables.
 * `fruma_deposits.bytes` is the raw file. Nothing in this schema updates it.
 */
export const POSTGRES_LEDGER_SCHEMA = `
CREATE TABLE IF NOT EXISTS fruma_header_maps (
  surface_environment ${SURFACE_SQL},
  surface TEXT NOT NULL,
  overlays JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (surface_environment, surface)
);
CREATE TABLE IF NOT EXISTS fruma_mill_requests (
  surface_environment ${SURFACE_SQL},
  id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (surface_environment, id)
);
CREATE TABLE IF NOT EXISTS fruma_mill_confirmations (
  surface_environment ${SURFACE_SQL},
  id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (surface_environment, id)
);
CREATE TABLE IF NOT EXISTS fruma_product_truth (
  surface_environment ${SURFACE_SQL},
  product_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (surface_environment, product_id, version)
);
CREATE TABLE IF NOT EXISTS fruma_deposits (
  id TEXT PRIMARY KEY,
  byte_hash TEXT NOT NULL,
  filename TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  surface_environment ${SURFACE_SQL},
  supplier_org_id TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  CONSTRAINT fruma_deposits_byte_hash_key UNIQUE (byte_hash)
);
CREATE TABLE IF NOT EXISTS fruma_source_cells (
  id TEXT PRIMARY KEY,
  deposit_id TEXT NOT NULL REFERENCES fruma_deposits (id),
  sheet_name TEXT NOT NULL,
  row_index INTEGER NOT NULL CHECK (row_index >= 1),
  col_index INTEGER NOT NULL CHECK (col_index >= 1),
  raw_header TEXT NOT NULL,
  source_value TEXT NOT NULL,
  surface_environment ${SURFACE_SQL},
  CONSTRAINT fruma_source_cells_slot_key UNIQUE (deposit_id, sheet_name, row_index, col_index)
);
CREATE TABLE IF NOT EXISTS fruma_named_grants (
  id TEXT PRIMARY KEY,
  mill_org_id TEXT NOT NULL,
  brand_org_id TEXT NOT NULL,
  scope_class TEXT NOT NULL CHECK (scope_class IN (${SCOPE_SQL})),
  created_at TIMESTAMPTZ NOT NULL,
  surface_environment ${SURFACE_SQL}
);
CREATE TABLE IF NOT EXISTS fruma_cell_mutation_events (
  event_id TEXT PRIMARY KEY,
  source_cell_id TEXT NOT NULL REFERENCES fruma_source_cells (id),
  operator_cookie TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('map', 'confirm')),
  old_standard_value TEXT,
  new_standard_value TEXT,
  standard_field TEXT CHECK (
    standard_field IS NULL OR standard_field IN (
      'article', 'construction', 'composition', 'weight', 'width', 'colour', 'moq', 'customer', 'cert'
    )
  ),
  occurred_at TIMESTAMPTZ NOT NULL,
  surface_environment ${SURFACE_SQL}
);
CREATE INDEX IF NOT EXISTS fruma_deposits_surface_idx ON fruma_deposits (surface_environment);
CREATE INDEX IF NOT EXISTS fruma_source_cells_surface_idx ON fruma_source_cells (surface_environment);
CREATE INDEX IF NOT EXISTS fruma_named_grants_surface_idx ON fruma_named_grants (surface_environment);
CREATE INDEX IF NOT EXISTS fruma_cell_mutation_events_cell_idx
  ON fruma_cell_mutation_events (source_cell_id, occurred_at);
CREATE INDEX IF NOT EXISTS fruma_cell_mutation_events_surface_idx
  ON fruma_cell_mutation_events (surface_environment);
`;

const LEDGER_TABLES = [
  "fruma_header_maps",
  "fruma_mill_requests",
  "fruma_mill_confirmations",
  "fruma_product_truth",
  "fruma_deposits",
  "fruma_source_cells",
  "fruma_named_grants",
  "fruma_cell_mutation_events",
] as const;

/**
 * Initialization must not ALTER a legacy JSONB deposit table into this ledger.
 * Those rows were written with ON CONFLICT DO UPDATE.
 */
export function legacyLedgerMessage(columnsByTable: Map<string, Set<string>>): string | null {
  const deposits = columnsByTable.get("fruma_deposits");
  if (deposits && (deposits.has("pointer") || !deposits.has("byte_hash") || !deposits.has("surface_environment"))) {
    return (
      "fruma_deposits is still the mutable JSONB spine (pointer / deposit_id upserts). " +
      "Drop the fruma_* spine tables before starting the immutable ledger. " +
      "Initialization will not ALTER or overwrite those rows."
    );
  }
  for (const table of LEDGER_TABLES) {
    const cols = columnsByTable.get(table);
    if (!cols) continue;
    if (!cols.has("surface_environment")) {
      return `${table} has no surface_environment column. Drop the legacy spine tables and reinitialize.`;
    }
  }
  return null;
}
