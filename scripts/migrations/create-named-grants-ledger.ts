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

/**
 * Legacy catalogs still use id, mill_org_id, scope_class, and created_at.
 * Each rename runs only when the old column is present and the new name is not,
 * so a second pass leaves an already-adapted catalog untouched.
 */
export const NAMED_GRANTS_RENAME_GRANT_ID_SQL = `
ALTER TABLE fruma_named_grants RENAME COLUMN id TO grant_id;
`.trim();

export const NAMED_GRANTS_RENAME_SUPPLIER_SQL = `
ALTER TABLE fruma_named_grants RENAME COLUMN mill_org_id TO supplier_org_id;
`.trim();

export const NAMED_GRANTS_RENAME_SCOPE_SQL = `
ALTER TABLE fruma_named_grants RENAME COLUMN scope_class TO access_scope;
`.trim();

export const NAMED_GRANTS_RENAME_GRANTED_AT_SQL = `
ALTER TABLE fruma_named_grants RENAME COLUMN created_at TO granted_at;
`.trim();

export const NAMED_GRANTS_REVOKED_COLUMN_SQL = `
ALTER TABLE fruma_named_grants ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN NOT NULL DEFAULT FALSE;
`.trim();

export const NAMED_GRANTS_RENAMES = [
  { from: "id", to: "grant_id", sql: NAMED_GRANTS_RENAME_GRANT_ID_SQL },
  { from: "mill_org_id", to: "supplier_org_id", sql: NAMED_GRANTS_RENAME_SUPPLIER_SQL },
  { from: "scope_class", to: "access_scope", sql: NAMED_GRANTS_RENAME_SCOPE_SQL },
  { from: "created_at", to: "granted_at", sql: NAMED_GRANTS_RENAME_GRANTED_AT_SQL },
] as const;

export const NAMED_GRANTS_COLUMN_INVENTORY_SQL = `
SELECT column_name
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'fruma_named_grants'
`.trim();

export const NAMED_GRANTS_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS named_grants_routing_idx 
  ON fruma_named_grants(brand_org_id, supplier_org_id, is_revoked);
`.trim();

type Statement<T extends Record<string, unknown>> = postgresTypes.PendingQuery<T[]>;

function staticStatement<T extends Record<string, unknown>>(sql: string): Statement<T> {
  const strings = Object.assign([sql], { raw: [sql] }) as unknown as TemplateStringsArray;
  return ledgerSql<T>(strings);
}

/** Rename clauses still required for this catalog. Already-adapted names are skipped. */
export function pendingNamedGrantRenames(columnNames: readonly string[]): readonly string[] {
  const present = new Set(columnNames.map((name) => name.toLowerCase()));
  return NAMED_GRANTS_RENAMES.flatMap((rename) => {
    const hasOld = present.has(rename.from);
    const hasNew = present.has(rename.to);
    if (hasOld && !hasNew) return [rename.sql];
    return [];
  });
}

/**
 * Provision the append-only named-grants table in each tenant schema.
 * `executeTenantQuery` pins `search_path` for that transaction, so the
 * unqualified table lands in `fruma_demo`, `fruma_test`, or `fruma_production`.
 * The routing index is created only after the legacy column names are adapted.
 */
export async function provisionNamedGrantsLedger(): Promise<void> {
  for (const namespace of NAMED_GRANTS_SCHEMAS) {
    await executeTenantQuery(namespace, staticStatement(NAMED_GRANTS_TABLE_SQL));
    const columns = await executeTenantQuery<{ column_name: string }>(
      namespace,
      staticStatement(NAMED_GRANTS_COLUMN_INVENTORY_SQL),
    );
    for (const sql of pendingNamedGrantRenames(columns.map((row) => row.column_name))) {
      await executeTenantQuery(namespace, staticStatement(sql));
    }
    await executeTenantQuery(namespace, staticStatement(NAMED_GRANTS_REVOKED_COLUMN_SQL));
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
