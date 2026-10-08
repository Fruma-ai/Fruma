import { sessionFounder } from "@/lib/gate";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "./postgres-schema";

const TENANT_NAMESPACES = Object.values(LEDGER_SCHEMAS);

export type SessionCookieStore = {
  get(name: string): { value: string } | undefined;
  getAll(): { name: string; value: string }[];
};

export function isTenantNamespace(value: string | undefined | null): value is LedgerSchemaName {
  return !!value && (TENANT_NAMESPACES as readonly string[]).includes(value);
}

/**
 * Active environment from the session cookies.
 * A cookie value of `fruma_demo`, `fruma_test`, or `fruma_production` wins.
 * Otherwise a cookie of that name holding a founder session selects its schema.
 */
export async function tenantNamespaceFromSessionCookies(
  store: SessionCookieStore,
): Promise<LedgerSchemaName | null> {
  for (const cookie of store.getAll()) {
    if (isTenantNamespace(cookie.value)) return cookie.value;
  }
  for (const name of TENANT_NAMESPACES) {
    const value = store.get(name)?.value;
    if (value && (await sessionFounder(value))) return name;
  }
  return null;
}
