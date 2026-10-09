import { pathToFileURL } from "node:url";
import type postgresTypes from "postgres";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "../../lib/fruma/persist/postgres-schema";
import { executeTenantQuery, ledgerSql } from "../../src/lib/db";

/** Tenant schemas that receive the named-grants ledger. */
export const NAMED_GRANTS_SCHEMAS = [
  LEDGER_SCHEMAS.demo,
  LEDGER_SCHEMAS.test,
  LEDGER_SCHEMAS.production,
] as const satisfies readonly LedgerSchemaName[];

export const NAMED_GRANTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS fruma_named_grants (
  grant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_org_id TEXT NOT NULL,
  supplier_org_id TEXT NOT NULL,
  access_scope TEXT NOT NULL CHECK (access_scope IN ('ARTICLE_READ', 'LEDGER_SYNC')),
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()::timestamptz
);
`.trim();

export const NAMED_GRANTS_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS named_grants_routing_idx 
  ON fruma_named_grants(brand_org_id, supplier_org_id, is_revoked);
`.trim();

type Statement = postgresTypes.PendingQuery<{ ok: boolean }[]>;

function staticStatement(sql: string): Statement {
  const strings = Object.assign([sql], { raw: [sql] }) as unknown as TemplateStringsArray;
  return ledgerSql<{ ok: boolean }>(strings);
}

/**
 * Provision the append-only named-grants table in each tenant schema.
 * `executeTenantQuery` pins `search_path` for that transaction, so the
 * unqualified table lands in `fruma_demo`, `fruma_test`, or `fruma_production`.
 */
export async function provisionNamedGrantsLedger(): Promise<void> {
  for (const namespace of NAMED_GRANTS_SCHEMAS) {
    await executeTenantQuery(namespace, staticStatement(NAMED_GRANTS_TABLE_SQL));
    await executeTenantQuery(namespace, staticStatement(NAMED_GRANTS_INDEX_SQL));
    console.log(`[named-grants] ${namespace} fruma_named_grants ready`);
  }
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  provisionNamedGrantsLedger().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "named grants provisioning failed";
    console.error(message);
    process.exitCode = 1;
  });
}
