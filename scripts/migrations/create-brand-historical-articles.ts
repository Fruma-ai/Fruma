import { pathToFileURL } from "node:url";
import type postgresTypes from "postgres";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "../../lib/fruma/persist/postgres-schema";
import { executeTenantQuery, ledgerSql } from "../../src/lib/db";

/** Tenant schemas that receive the brand historical article recall. */
export const HISTORICAL_SCHEMAS = [
  LEDGER_SCHEMAS.demo,
  LEDGER_SCHEMAS.test,
  LEDGER_SCHEMAS.production,
] as const satisfies readonly LedgerSchemaName[];

/**
 * Brand PLM recall. Match on the mill and the material hash from standardized
 * source-cell text.
 */
export const BRAND_HISTORICAL_ARTICLES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS fruma_brand_historical_articles (
  article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_org_id TEXT NOT NULL,        -- Links back to the physical textile mill
  article_code TEXT NOT NULL,           -- The brand's internal style identifier (e.g., JK-2026)
  composition TEXT NOT NULL,            -- The verified fabric breakdown text string
  material_hash TEXT NOT NULL,          -- Generated from the standardized source cell text
  last_ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()::timestamptz
);
`.trim();

export const BRAND_HISTORICAL_RECALL_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS brand_historical_recall_idx 
  ON fruma_brand_historical_articles(material_hash, supplier_org_id);
`.trim();

type Statement = postgresTypes.PendingQuery<{ ok: boolean }[]>;

function staticStatement(sql: string): Statement {
  const strings = Object.assign([sql], { raw: [sql] }) as unknown as TemplateStringsArray;
  return ledgerSql<{ ok: boolean }>(strings);
}

function schemaStatement(namespace: LedgerSchemaName): Statement {
  switch (namespace) {
    case "fruma_demo":
      return ledgerSql<{ ok: boolean }>`CREATE SCHEMA IF NOT EXISTS fruma_demo`;
    case "fruma_test":
      return ledgerSql<{ ok: boolean }>`CREATE SCHEMA IF NOT EXISTS fruma_test`;
    case "fruma_production":
      return ledgerSql<{ ok: boolean }>`CREATE SCHEMA IF NOT EXISTS fruma_production`;
  }
}

/**
 * Create the historical article table in each tenant schema.
 * `executeTenantQuery` pins `search_path` for that transaction, so the
 * unqualified table lands in `fruma_demo`, `fruma_test`, or `fruma_production`.
 */
export async function provisionBrandHistoricalArticles(): Promise<void> {
  for (const namespace of HISTORICAL_SCHEMAS) {
    await executeTenantQuery(namespace, schemaStatement(namespace));
    await executeTenantQuery(namespace, staticStatement(BRAND_HISTORICAL_ARTICLES_TABLE_SQL));
    await executeTenantQuery(namespace, staticStatement(BRAND_HISTORICAL_RECALL_INDEX_SQL));
    console.log(`[historical] ${namespace} fruma_brand_historical_articles ready`);
  }
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  provisionBrandHistoricalArticles().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "historical article provisioning failed";
    console.error(message);
    process.exitCode = 1;
  });
}
