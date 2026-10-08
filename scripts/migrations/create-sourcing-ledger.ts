import { pathToFileURL } from "node:url";
import type postgres from "postgres";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "../../lib/fruma/persist/postgres-schema";
import { executeTenantQuery, ledgerSql } from "../../src/lib/db";

/** Tenant schemas that receive the sourcing message log. */
export const SOURCING_SCHEMAS = [
  LEDGER_SCHEMAS.demo,
  LEDGER_SCHEMAS.test,
  LEDGER_SCHEMAS.production,
] as const satisfies readonly LedgerSchemaName[];

type Statement = postgres.PendingQuery<{ ok: boolean }[]>;

/**
 * Append-only communication log for one deposit.
 * Rows are added later. This migration only creates the table and its index.
 */
export const SOURCING_MESSAGES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS fruma_sourcing_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id TEXT NOT NULL REFERENCES fruma_deposits(id),
  sender_handle TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()::timestamptz
)`.trim();

export const SOURCING_MESSAGES_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS sourcing_messages_deposit_idx
  ON fruma_sourcing_messages(deposit_id, sent_at DESC)
`.trim();

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
 * Create the sourcing message table in each tenant schema.
 * `executeTenantQuery` pins `search_path` for that transaction, so the
 * unqualified table lands in `fruma_demo`, `fruma_test`, or `fruma_production`.
 */
export async function provisionSourcingLedger(): Promise<void> {
  for (const namespace of SOURCING_SCHEMAS) {
    await executeTenantQuery(namespace, schemaStatement(namespace));
    await executeTenantQuery(namespace, staticStatement(SOURCING_MESSAGES_TABLE_SQL));
    await executeTenantQuery(namespace, staticStatement(SOURCING_MESSAGES_INDEX_SQL));
    console.log(`[sourcing] ${namespace} fruma_sourcing_messages ready`);
  }
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  provisionSourcingLedger().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "sourcing ledger provisioning failed";
    console.error(message);
    process.exitCode = 1;
  });
}
