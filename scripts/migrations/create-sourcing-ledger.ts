import { pathToFileURL } from "node:url";
import postgres from "postgres";
import type postgresTypes from "postgres";
import { MissingConfigurationException } from "../../lib/fruma/persist/configuration";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "../../lib/fruma/persist/postgres-schema";
import { executeTenantQuery, ledgerSql } from "../../src/lib/db";

/** Tenant schemas that receive the sourcing message log. */
export const SOURCING_SCHEMAS = [
  LEDGER_SCHEMAS.demo,
  LEDGER_SCHEMAS.test,
  LEDGER_SCHEMAS.production,
] as const satisfies readonly LedgerSchemaName[];

/**
 * Append-only communication log for one deposit.
 * Rows are added by sendSourcingMessage. This migration creates the table and its index.
 */
export const SOURCING_MESSAGES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS fruma_sourcing_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id TEXT NOT NULL REFERENCES fruma_deposits(id),
  sender_handle TEXT NOT NULL,
  is_identity_disclosed BOOLEAN NOT NULL DEFAULT FALSE,
  encrypted_payload TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()::timestamptz
)`.trim();

export const SOURCING_MESSAGES_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS sourcing_messages_deposit_idx
  ON fruma_sourcing_messages(deposit_id, sent_at DESC)
`.trim();

/** Adds the disclosure flag on ledgers created before that column existed. */
export const SOURCING_DISCLOSURE_COLUMN_SQL =
  "ALTER TABLE fruma_sourcing_messages ADD COLUMN IF NOT EXISTS is_identity_disclosed BOOLEAN NOT NULL DEFAULT FALSE";

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

/**
 * Idempotent column add for schemas whose message table was created first.
 * Identifiers come from the closed schema list inside each transaction.
 */
export async function ensureSourcingDisclosureColumn(): Promise<void> {
  if (
    SOURCING_DISCLOSURE_COLUMN_SQL !==
    "ALTER TABLE fruma_sourcing_messages ADD COLUMN IF NOT EXISTS is_identity_disclosed BOOLEAN NOT NULL DEFAULT FALSE"
  ) {
    throw new Error("disclosure_column_sql");
  }
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new MissingConfigurationException(
      "CRITICAL_CONFIG_ERROR: DATABASE_URL is missing. Connection pool refused.",
    );
  }
  const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 0 });
  try {
    for (const namespace of SOURCING_SCHEMAS) {
      await sql.begin(async (tx) => {
        await tx`SET LOCAL search_path TO ${tx(namespace)}, public`;
        await tx.unsafe(SOURCING_DISCLOSURE_COLUMN_SQL);
      });
    }
  } finally {
    await sql.end({ timeout: 1 });
  }
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  provisionSourcingLedger()
    .then(() => ensureSourcingDisclosureColumn())
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "sourcing ledger provisioning failed";
      console.error(message);
      process.exitCode = 1;
    });
}
