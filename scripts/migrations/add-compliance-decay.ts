import { pathToFileURL } from "node:url";
import type postgresTypes from "postgres";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "../../lib/fruma/persist/postgres-schema";
import { executeTenantQuery, ledgerSql } from "../../src/lib/db";

/** Tenant schemas whose factory profiles receive the expiry column. */
export const COMPLIANCE_DECAY_SCHEMAS = [
  LEDGER_SCHEMAS.demo,
  LEDGER_SCHEMAS.test,
  LEDGER_SCHEMAS.production,
] as const satisfies readonly LedgerSchemaName[];

/**
 * Certificate expiry on the factory profile.
 * Factory profiles identify the mill with mill_org_id, so the expiry index
 * uses that column.
 */
export const FACTORY_PROFILE_EXPIRY_COLUMN_SQL = `
ALTER TABLE fruma_factory_profiles 
  ADD COLUMN IF NOT EXISTS certificate_expiry_date TIMESTAMPTZ;
`.trim();

export const FACTORY_PROFILE_EXPIRY_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS factory_profile_expiry_idx 
  ON fruma_factory_profiles(mill_org_id, certificate_expiry_date DESC);
`.trim();

type Statement = postgresTypes.PendingQuery<{ ok: boolean }[]>;

function staticStatement(sql: string): Statement {
  const strings = Object.assign([sql], { raw: [sql] }) as unknown as TemplateStringsArray;
  return ledgerSql<{ ok: boolean }>(strings);
}

/**
 * Add certificate expiry tracking in each tenant schema.
 * `executeTenantQuery` pins `search_path` for that transaction, so the
 * unqualified table lands in `fruma_demo`, `fruma_test`, or `fruma_production`.
 */
export async function provisionComplianceDecay(): Promise<void> {
  for (const namespace of COMPLIANCE_DECAY_SCHEMAS) {
    await executeTenantQuery(namespace, staticStatement(FACTORY_PROFILE_EXPIRY_COLUMN_SQL));
    await executeTenantQuery(namespace, staticStatement(FACTORY_PROFILE_EXPIRY_INDEX_SQL));
    console.log(`[compliance-decay] ${namespace} certificate_expiry_date ready`);
  }
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  provisionComplianceDecay().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "compliance decay provisioning failed";
    console.error(message);
    process.exitCode = 1;
  });
}
