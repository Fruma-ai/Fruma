import { MissingConfigurationException } from "./configuration";
import { assertLedgerSchema, ledgerSchemaName, type LedgerSchemaName } from "./postgres-schema";
import { isFrumaVersion, type FrumaVersion } from "../versions";

/** Closed tenant schemas. Raw identifiers never reach SET search_path. */
export type TenantNamespace = LedgerSchemaName;

const DESTRUCTIVE =
  /\b(?:UPDATE|DELETE|DROP)\b/i;

const BLOCKED =
  "CRITICAL_VIOLATION: Destructive mutations are blocked on the append-only ledger.";

type TenantSession = {
  unsafe(
    query: string,
    parameters?: readonly unknown[],
  ): PromiseLike<readonly Record<string, unknown>[]>;
};

type TenantPool = {
  begin<T>(callback: (tx: TenantSession) => Promise<T>): Promise<T>;
};

let shared: TenantPool | null = null;
let override: TenantPool | null = null;

/** Tests supply a pool. Pass null to use DATABASE_URL again. */
export function setTenantPoolForTests(pool: TenantPool | null): void {
  override = pool;
}

function versionForNamespace(namespace: string): FrumaVersion {
  const schema = assertLedgerSchema(namespace);
  const version = schema.slice("fruma_".length);
  if (!isFrumaVersion(version) || ledgerSchemaName(version) !== schema) {
    throw new Error("targetSchema must be fruma_demo, fruma_test, or fruma_production");
  }
  return version;
}

function localSearchPath(namespace: TenantNamespace): string {
  const schema = ledgerSchemaName(versionForNamespace(namespace));
  return `SET LOCAL search_path TO ${schema}, public;`;
}

/** Strip comments and literals so `updated_at` and quoted text are not treated as statements. */
function sqlForScan(query: string): string {
  return query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/\$([A-Za-z0-9_]*)\$[\s\S]*?\$\1\$/g, " ")
    .replace(/'(?:''|[^'])*'/g, " ")
    .replace(/"(?:[^"]|"")*"/g, " ");
}

export function assertAppendOnlyQuery(query: string): string {
  const text = query.trim();
  if (!text) throw new Error("query is required");
  if (DESTRUCTIVE.test(sqlForScan(text))) throw new Error(BLOCKED);
  return query;
}

async function tenantPool(): Promise<TenantPool> {
  if (override) return override;
  if (shared) return shared;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new MissingConfigurationException("DATABASE_URL is required for the tenant ledger.");
  }
  const postgres = (await import("postgres")).default;
  shared = postgres(url, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 2,
    prepare: false,
  });
  return shared;
}

/**
 * Run one statement inside a transaction whose search_path is only that tenant
 * schema, then public. The path ends with the transaction, so the pooled
 * connection does not keep the tenant.
 */
export async function executeTenantQuery<T>(
  namespace: TenantNamespace,
  queryText: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const statement = assertAppendOnlyQuery(queryText);
  const setPath = localSearchPath(namespace);
  const pool = await tenantPool();
  const rows = await pool.begin(async (tx) => {
    await tx.unsafe(setPath);
    return tx.unsafe(statement, params);
  });
  return [...rows] as T[];
}
