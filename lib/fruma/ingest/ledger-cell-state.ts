import { requireTestFounder } from "../intelligence/http-auth";
import { getSpineStore } from "../persist";
import { surfaceFromRequest } from "../surfaces";
import type { FrumaVersion } from "../versions";
import {
  supplierParsingAnomalies,
  type SupplierParsingAnomaly,
} from "./supplier-anomalies";

export type LedgerCellStateHttpResult =
  | { status: 200; surface: FrumaVersion; body: { anomalies: SupplierParsingAnomaly[] } }
  | { status: 401; surface: FrumaVersion; body: { error: string } };

function assertNoFileBytes(value: unknown): void {
  if (value instanceof Uint8Array) {
    throw new Error("Ledger cell state included file bytes.");
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoFileBytes(item);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "bytes" || key === "operatorCookie") {
      throw new Error("Ledger cell state included a private column.");
    }
    assertNoFileBytes(child);
  }
}

/**
 * Reads `fruma_source_cells` left-joined to `fruma_cell_mutation_events`
 * (`listSourceCellsWithMutations` orders that join by `occurred_at`) and
 * replays the final cell in memory.
 */
export async function readSupplierParsingAnomalies(
  surface: FrumaVersion,
  filter?: { depositId?: string },
): Promise<SupplierParsingAnomaly[]> {
  const store = getSpineStore(surface);
  const depositId = filter?.depositId?.trim();
  const [rows, headerMap] = await Promise.all([
    store.listSourceCellsWithMutations(depositId ? { depositId } : undefined),
    store.latestActiveHeaderMap(surface),
  ]);
  return supplierParsingAnomalies(rows, headerMap?.overlays);
}

export async function handleLedgerCellStateRequest(request: Request): Promise<LedgerCellStateHttpResult> {
  const surface = surfaceFromRequest(request);
  const who = await requireTestFounder(request);
  if (!who) {
    return { status: 401, surface, body: { error: "Sign in to read mill cells." } };
  }

  const depositId = new URL(request.url).searchParams.get("depositId");
  const anomalies = await readSupplierParsingAnomalies(
    surface,
    depositId?.trim() ? { depositId: depositId.trim() } : undefined,
  );
  const body = { anomalies };
  assertNoFileBytes(body);
  return { status: 200, surface, body };
}
