import type postgres from "postgres";

export { executeTenantQuery, type TenantNamespace } from "@/lib/fruma/persist/tenant-query";

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
