import { isStandardField } from "@/lib/fruma/ingest/types";
import type { SupplierParsingAnomaly } from "@/lib/fruma/ingest/supplier-anomalies";

export type TenantVersion = "demo" | "test" | "production";

export type PendingCellOverride = {
  cellId: string;
  field: string;
  newValue: string;
};

export const DEPOSITS_MUTATE_PATH = "/api/deposits/mutate";

/** One cell and field. An empty value removes that override. */
export function stageCellOverride(
  previous: readonly PendingCellOverride[],
  cellId: string,
  field: string,
  value: string,
): PendingCellOverride[] {
  const filtered = previous.filter((row) => !(row.cellId === cellId && row.field === field));
  if (!value) return filtered;
  return [...filtered, { cellId, field, newValue: value }];
}

/** Amber rows that already name a cell and a standard field. */
export function pendingOverridesFromAnomalies(
  anomalies: readonly SupplierParsingAnomaly[],
): PendingCellOverride[] {
  const pending: PendingCellOverride[] = [];
  for (const row of anomalies) {
    const cellId = row.cellId?.trim() ?? "";
    const field = row.standardField?.trim() ?? "";
    if (!cellId || !isStandardField(field)) continue;
    pending.push({ cellId, field, newValue: row.sourceValue });
  }
  return pending;
}

/**
 * Posts the dashed-amber overrides for the session tenant, then refreshes.
 * `tenantVersion` is the signed-in schema, never a fixed production literal.
 */
export async function confirmPendingOverrides(
  pendingOverrides: readonly PendingCellOverride[],
  tenantVersion: TenantVersion,
  refresh: () => void,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (pendingOverrides.length === 0) return false;
  const response = await fetchImpl(DEPOSITS_MUTATE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exceptions: pendingOverrides,
      tenantVersion,
    }),
  });
  if (response.ok) {
    refresh();
    return true;
  }
  return false;
}
