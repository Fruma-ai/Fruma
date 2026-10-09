import postgres from "postgres";
import { interceptCrossSchemaAccess } from "@/src/lib/fruma/security/interceptor";
import { MissingConfigurationException } from "./configuration";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "./postgres-schema";

/** Closed tenant schemas. Raw identifiers never reach SET search_path. */
export type TenantNamespace = LedgerSchemaName;

const TENANT_NAMESPACES = Object.values(LEDGER_SCHEMAS);

/**
 * Statement keywords that mutate rows or reassign privileges.
 * `replace(` is the string function and stays allowed. `CREATE OR REPLACE` does not.
 * The only ALTER that stays allowed is the certificate-expiry column add below.
 */
const ROW_MUTATION =
  /\b(?:UPDATE|DELETE|DROP|TRUNCATE|GRANT|REVOKE|REPLACE(?!\s*\())\b/i;

/**
 * Idempotent expiry column on `fruma_factory_profiles`.
 * Any other ALTER, including a different ADD COLUMN, stays blocked.
 */
const CERTIFICATE_EXPIRY_COLUMN =
  /^\s*ALTER\s+TABLE\s+fruma_factory_profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+certificate_expiry_date\s+TIMESTAMPTZ\s*;?\s*$/i;

const BLOCKED =
  "CRITICAL_VIOLATION: Non-destructive engine rules violated. Mutation blocked upstream.";

const MISSING_DATABASE_URL =
  "CRITICAL_CONFIG_ERROR: DATABASE_URL is missing. Connection pool refused.";

const CROSS_SCHEMA_DENIED =
  "SECURITY_VIOLATION: Cross-schema database access explicitly denied.";

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
  const scanned = sqlForScan(text);
  if (ROW_MUTATION.test(scanned)) throw new Error(BLOCKED);
  if (/\bALTER\b/i.test(scanned) && !CERTIFICATE_EXPIRY_COLUMN.test(scanned)) {
    throw new Error(BLOCKED);
  }
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

/** Join template text, including nested fragments, so `fruma_production.` cannot hide in a gap. */
function rawSqlFromPendingQuery(query: unknown, seen = new Set<unknown>()): string {
  if (!isTaggedQuery(query) || seen.has(query)) return "";
  seen.add(query);
  let text = query.strings.join("");
  for (const arg of query.args ?? []) {
    text += rawSqlFromPendingQuery(arg, seen);
    if (Array.isArray(arg)) {
      for (const item of arg) text += rawSqlFromPendingQuery(item, seen);
    }
  }
  return text;
}

function assertCrossSchemaBoundary(query: TaggedQuery): void {
  const access = interceptCrossSchemaAccess(rawSqlFromPendingQuery(query));
  if (!access.isSafe) throw new Error(CROSS_SCHEMA_DENIED);
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

export type TenantQueryOptions = {
  /** Opens `BEGIN READ ONLY` before the statement. Inbox reads set this. */
  readOnly?: boolean;
};

/**
 * Run one postgres.js query inside a transaction whose search_path is that
 * tenant schema, then public. SET LOCAL ends with the transaction, so the
 * pooled connection does not keep the tenant. UPDATE, DELETE, DROP, TRUNCATE,
 * GRANT, REVOKE, CREATE OR REPLACE, and every ALTER other than
 * `ADD COLUMN IF NOT EXISTS certificate_expiry_date TIMESTAMPTZ`
 * on `fruma_factory_profiles` are rejected before a connection opens.
 * Dot notation into `fruma_demo`, `fruma_test`, or `fruma_production` is
 * rejected before a connection opens and before `SET LOCAL search_path`.
 * `readOnly` opens the transaction with `READ ONLY`.
 */
export async function executeTenantQuery<T extends object>(
  namespace: TenantNamespace,
  queryExpression: postgres.PendingQuery<T[]>,
  options?: TenantQueryOptions,
): Promise<T[]> {
  if (!isTenantNamespace(namespace)) {
    throw new Error(`SECURITY_VIOLATION: Unrecognized tenant namespace context: "${namespace}"`);
  }
  const parts = queryParts(queryExpression);
  assertCrossSchemaBoundary(parts);
  assertTaggedQuery(parts, new Set());

  const run = async (tx: postgres.TransactionSql) => {
    await tx`SET LOCAL search_path TO ${tx(namespace)}, public;`;
    return await runOnTransaction<T>(tx, parts);
  };

  const sql = await tenantPool();
  try {
    if (options?.readOnly) {
      const beginReadOnly = (
        sql as unknown as {
          begin<R>(
            mode: "READ ONLY",
            callback: (tx: postgres.TransactionSql) => Promise<R>,
          ): Promise<R>;
        }
      ).begin.bind(sql);
      return await beginReadOnly("READ ONLY", run);
    }
    return await sql.begin(run);
  } catch (error) {
    console.error(`[LEDGER EXECUTION FAILURE] Tenant: ${namespace} | Msg:`, error);
    throw error;
  }
}
