import postgres from "postgres";
import { MissingConfigurationException } from "./configuration";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "./postgres-schema";

/** Closed tenant schemas. Raw identifiers never reach SET search_path. */
export type TenantNamespace = LedgerSchemaName;

const TENANT_NAMESPACES = Object.values(LEDGER_SCHEMAS);

/**
 * Statement keywords that mutate or reassign privileges.
 * `replace(` is the string function and stays allowed. `CREATE OR REPLACE` does not.
 */
const DESTRUCTIVE =
  /\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE|REPLACE(?!\s*\())\b/i;

const BLOCKED =
  "CRITICAL_VIOLATION: Non-destructive engine rules violated. Mutation blocked upstream.";

const MISSING_DATABASE_URL =
  "CRITICAL_CONFIG_ERROR: DATABASE_URL is missing. Connection pool refused.";

type TaggedQuery = {
  strings: TemplateStringsArray | readonly string[];
  args?: readonly unknown[];
  executed?: boolean;
};

type TenantPool = {
  begin<T>(callback: (tx: postgres.TransactionSql) => Promise<T>): Promise<T>;
};

let shared: postgres.Sql | null = null;
let override: TenantPool | null = null;

/** Tests supply a pool. Pass null to use DATABASE_URL again. */
export function setTenantPoolForTests(pool: TenantPool | null): void {
  override = pool;
}

function isTenantNamespace(value: string): value is TenantNamespace {
  return (TENANT_NAMESPACES as readonly string[]).includes(value);
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

function isTaggedQuery(value: unknown): value is TaggedQuery {
  if (!value || typeof value !== "object" || !("strings" in value)) return false;
  const strings = (value as { strings?: unknown }).strings;
  return Array.isArray(strings);
}

function assertTaggedQuery(query: TaggedQuery, seen: Set<unknown>): void {
  if (seen.has(query)) return;
  seen.add(query);
  assertAppendOnlyQuery(query.strings.join("?"));
  for (const arg of query.args ?? []) {
    if (isTaggedQuery(arg)) assertTaggedQuery(arg, seen);
    if (Array.isArray(arg)) {
      for (const item of arg) {
        if (isTaggedQuery(item)) assertTaggedQuery(item, seen);
      }
    }
  }
}

function queryParts(query: unknown): TaggedQuery {
  if (!isTaggedQuery(query)) {
    throw new Error("query must be a postgres.js tagged template");
  }
  if (query.executed) {
    throw new Error("query already started on another connection");
  }
  return query;
}

/**
 * Replay the tagged query on the transaction connection.
 * Awaiting the original PendingQuery checks out a different pool connection,
 * so SET LOCAL on this transaction would not apply to it.
 */
function runOnTransaction<T extends object>(
  tx: postgres.TransactionSql,
  query: TaggedQuery,
): postgres.PendingQuery<T[]> {
  const args = query.args ?? [];
  const strings = query.strings;
  if ("raw" in strings && Array.isArray(strings.raw)) {
    const tagged = tx as unknown as (
      template: TemplateStringsArray,
      ...parameters: readonly unknown[]
    ) => postgres.PendingQuery<T[]>;
    return tagged(strings as TemplateStringsArray, ...args);
  }
  const text = strings[0];
  if (strings.length === 1 && typeof text === "string") {
    return tx.unsafe(text, [...args] as never[]) as unknown as postgres.PendingQuery<T[]>;
  }
  throw new Error("query must be a postgres.js tagged template");
}

async function tenantPool(): Promise<TenantPool> {
  if (override) return override;
  if (shared) return shared;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new MissingConfigurationException(MISSING_DATABASE_URL);
  shared = postgres(url, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 2,
    prepare: false,
  });
  return shared;
}

/**
 * Run one postgres.js query inside a transaction whose search_path is that
 * tenant schema, then public. SET LOCAL ends with the transaction, so the
 * pooled connection does not keep the tenant. UPDATE, DELETE, DROP, TRUNCATE,
 * ALTER, GRANT, REVOKE, and CREATE OR REPLACE are rejected before a connection opens.
 */
export async function executeTenantQuery<T extends object>(
  namespace: TenantNamespace,
  queryExpression: postgres.PendingQuery<T[]>,
): Promise<T[]> {
  if (!isTenantNamespace(namespace)) {
    throw new Error(`SECURITY_VIOLATION: Unrecognized tenant namespace context: "${namespace}"`);
  }
  const parts = queryParts(queryExpression);
  assertTaggedQuery(parts, new Set());

  const sql = await tenantPool();
  try {
    return await sql.begin(async (tx) => {
      await tx`SET LOCAL search_path TO ${tx(namespace)}, public;`;
      return await runOnTransaction<T>(tx, parts);
    });
  } catch (error) {
    console.error(`[LEDGER EXECUTION FAILURE] Tenant: ${namespace} | Msg:`, error);
    throw error;
  }
}
