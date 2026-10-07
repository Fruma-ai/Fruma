import { requireTestFounder } from "../intelligence/http-auth";
import type { PersistedSourceCell } from "../persist";
import { getSpineStore } from "../persist";
import { surfaceFromRequest } from "../surfaces";
import type { FrumaVersion } from "../versions";
import { columnLetter } from "../ingest/columns";
import { isStandardField, STANDARD_FIELDS, type StandardField } from "../ingest/types";

export type IgnoredMillHeader = {
  cellId: string;
  header: string;
  sheet: string;
  row: number;
  column: string;
  sourceValue: string;
};

export type DesignRefusals = {
  depositId: string;
  unmapped_mandatory_fields: StandardField[];
  ignored_mill_headers: IgnoredMillHeader[];
};

export type DesignRefusalsHttpResult =
  | { status: 200; surface: FrumaVersion; body: DesignRefusals }
  | { status: 400; surface: FrumaVersion; body: { error: string } }
  | { status: 401; surface: FrumaVersion; body: { error: string } };

function overlayField(
  overlays: Record<string, StandardField>,
  header: string,
): StandardField | undefined {
  const key = header.trim().toLowerCase();
  if (!key) return undefined;
  const field = overlays[key];
  return field && isStandardField(field) ? field : undefined;
}

/**
 * Active header-map overlays are the only accepted columns.
 * A mill header with no overlay entry was refused. Builtin aliases are not applied.
 */
export function refusalsForDeposit(
  depositId: string,
  overlays: Record<string, StandardField>,
  cells: readonly PersistedSourceCell[],
): DesignRefusals {
  const mapped = new Set<StandardField>();
  const ignored = new Map<string, IgnoredMillHeader>();

  const ordered = [...cells].sort(
    (a, b) =>
      a.sheetName.localeCompare(b.sheetName) || a.rowIndex - b.rowIndex || a.colIndex - b.colIndex,
  );

  for (const cell of ordered) {
    const header = cell.rawHeader.trim();
    if (!header) continue;
    const field = overlayField(overlays, header);
    if (field) {
      mapped.add(field);
      continue;
    }
    const key = `${cell.sheetName}\0${header.toLowerCase()}`;
    if (ignored.has(key)) continue;
    ignored.set(key, {
      cellId: cell.id,
      header: cell.rawHeader,
      sheet: cell.sheetName,
      row: cell.rowIndex,
      column: columnLetter(cell.colIndex - 1),
      sourceValue: cell.sourceValue,
    });
  }

  return {
    depositId,
    unmapped_mandatory_fields: STANDARD_FIELDS.filter((field) => !mapped.has(field)),
    ignored_mill_headers: [...ignored.values()],
  };
}

function assertNoFileBytes(value: unknown): void {
  if (value instanceof Uint8Array) {
    throw new Error("Design refusals payload included file bytes.");
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoFileBytes(item);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "bytes") throw new Error("Design refusals payload included file bytes.");
    assertNoFileBytes(child);
  }
}

export async function handleDesignRefusalsRequest(
  request: Request,
): Promise<DesignRefusalsHttpResult> {
  const surface = surfaceFromRequest(request);
  const who = await requireTestFounder(request);
  if (!who) {
    return { status: 401, surface, body: { error: "Sign in to read design refusals." } };
  }

  const depositId = new URL(request.url).searchParams.get("depositId")?.trim() ?? "";
  if (!depositId) {
    return { status: 400, surface, body: { error: "depositId is required." } };
  }

  const store = getSpineStore(surface);
  const [map, cells] = await Promise.all([
    store.latestActiveHeaderMap(surface),
    store.listDepositSourceCells(depositId),
  ]);
  const body = refusalsForDeposit(depositId, map?.overlays ?? {}, cells);
  assertNoFileBytes(body);
  return { status: 200, surface, body };
}
