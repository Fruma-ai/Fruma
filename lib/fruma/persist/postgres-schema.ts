/**
 * Closed tenant schemas for the ledger session.
 * `executeTenantQuery` sets `search_path` from this map. Request text never becomes an identifier.
 */
export const LEDGER_SCHEMAS = {
  demo: "fruma_demo",
  test: "fruma_test",
  production: "fruma_production",
} as const;

export type LedgerSchemaName = (typeof LEDGER_SCHEMAS)[keyof typeof LEDGER_SCHEMAS];
