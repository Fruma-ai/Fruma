import type postgres from "postgres";
import {
  executeTenantQuery as runTenantQuery,
  rawSqlFromPendingQuery,
  type TenantNamespace,
  type TenantQueryOptions,
} from "@/lib/fruma/persist/tenant-query";
import { interceptCrossSchemaAccess } from "./fruma/security/interceptor";

export type { TenantNamespace };

const CROSS_SCHEMA_DENIED =
  "SECURITY_VIOLATION: Cross-schema database access explicitly denied.";

/**
 * Run one query on the tenant pool.
 * The raw SQL is scanned before `runTenantQuery` checks out a connection
 * or sets `search_path`. A dotted tenant schema stops the call here.
 */
export async function executeTenantQuery<T extends object>(
  namespace: TenantNamespace,
  queryExpression: postgres.PendingQuery<T[]>,
  options?: TenantQueryOptions,
): Promise<T[]> {
  const access = interceptCrossSchemaAccess(rawSqlFromPendingQuery(queryExpression));
  if (!access.isSafe) throw new Error(CROSS_SCHEMA_DENIED);
  return runTenantQuery(namespace, queryExpression, options);
}

/**
 * Builds a postgres.js tagged query without starting it.
 * `executeTenantQuery` replays the same strings and arguments on the
 * tenant transaction. Calling then/catch here would open a second connection.
 */
export function ledgerSql<T extends object>(
  strings: TemplateStringsArray,
  ...args: readonly unknown[]
): postgres.PendingQuery<T[]> {
  const pending = Promise.resolve([] as T[]);
  return Object.assign(pending, {
    strings,
    args,
    executed: false,
    then() {
      throw new Error("query ran outside executeTenantQuery");
    },
  }) as unknown as postgres.PendingQuery<T[]>;
}
