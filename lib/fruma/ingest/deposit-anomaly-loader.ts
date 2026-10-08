import { sessionFounder } from "@/lib/gate";
import { isStandardField, type StandardField } from "@/lib/fruma/ingest/types";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import type { JoinedSourceCell, PersistedCellMutation } from "@/lib/fruma/persist/types";
import type { FrumaVersion } from "@/lib/fruma/versions";

const TENANT_NAMESPACES = Object.values(LEDGER_SCHEMAS);

const VERSION_OF: Record<LedgerSchemaName, FrumaVersion> = {
  fruma_demo: "demo",
  fruma_test: "test",
  fruma_production: "production",
};

export type SessionCookieStore = {
  get(name: string): { value: string } | undefined;
  getAll(): { name: string; value: string }[];
};

/** One `fruma_source_cells` row left-joined to a mutation event. No operator cookie, no file bytes. */
export type DepositCellLedgerRow = {
  id: string;
  deposit_id: string;
  sheet_name: string;
  row_index: number;
  col_index: number;
  raw_header: string;
  source_value: string;
  normalized_value: string | null;
  event_id: string | null;
  action_type: string | null;
  old_standard_value: string | null;
  new_standard_value: string | null;
  standard_field: string | null;
  occurred_at: string | Date | null;
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

export function versionFromNamespace(namespace: LedgerSchemaName): FrumaVersion {
  return VERSION_OF[namespace];
}

export function overlaysFromLedger(value: unknown): Record<string, StandardField> | undefined {
  const parsed = typeof value === "string" ? safeJson(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const overlays: Record<string, StandardField> = {};
  for (const [header, field] of Object.entries(parsed)) {
    const key = header.trim().toLowerCase();
    if (key && typeof field === "string" && isStandardField(field)) overlays[key] = field;
  }
  return overlays;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isoTimestamp(value: string | Date | null): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return new Date(value).toISOString();
  return "";
}

/**
 * Groups a chronological left join into one cell plus its event log.
 * `occurred_at` order is preserved, then replayed by `resolveActiveCell`.
 */
export function joinedCellsFromLedgerRows(rows: readonly DepositCellLedgerRow[]): JoinedSourceCell[] {
  const byId = new Map<string, JoinedSourceCell>();
  for (const row of rows) {
    const id = String(row.id);
    let group = byId.get(id);
    if (!group) {
      group = {
        cell: {
          id,
          depositId: String(row.deposit_id),
          sheetName: String(row.sheet_name),
          rowIndex: Number(row.row_index),
          colIndex: Number(row.col_index),
          rawHeader: String(row.raw_header),
          sourceValue: String(row.source_value),
          normalizedValue: row.normalized_value == null ? null : String(row.normalized_value),
        },
        supplierOrgId: "",
        mutations: [],
      };
      byId.set(id, group);
    }
    if (row.event_id == null) continue;
    const field = row.standard_field;
    const mutation: PersistedCellMutation = {
      eventId: String(row.event_id),
      sourceCellId: id,
      operatorCookie: "",
      actionType: row.action_type === "confirm" ? "confirm" : "map",
      oldStandardValue: row.old_standard_value == null ? null : String(row.old_standard_value),
      newStandardValue: row.new_standard_value == null ? null : String(row.new_standard_value),
      standardField: typeof field === "string" && isStandardField(field) ? field : null,
      occurredAt: isoTimestamp(row.occurred_at),
    };
    group.mutations.push(mutation);
  }
  for (const group of byId.values()) {
    group.mutations.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }
  return [...byId.values()];
}
