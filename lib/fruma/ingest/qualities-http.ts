import { DEMO_COOKIE, sessionFounder } from "../../gate";
import type { JoinedSourceCell } from "../persist";
import { getSpineStore } from "../persist";
import { surfaceFromRequest } from "../surfaces";
import type { FrumaVersion } from "../versions";
import { resolveActiveCell } from "./cell-mutations";
import { columnLetter } from "./columns";
import { qualitiesFromCells } from "./identity";
import type { SourceCell, StandardField } from "./types";

export type ActiveMaterialQuality = {
  id: string;
  supplierOrgId: string;
  millArticleCode: string;
  depositId: string;
  visibility: "Private" | "Granted" | "Revoked";
  colourways: { id: string; colourAsWritten: string }[];
  widths: { valueAsWritten: string }[];
  cells: {
    sheet: string;
    row: number;
    column: string;
    header: string;
    sourceValue: string;
    standardField: StandardField | null;
    standardValue: string | null;
    normalizedValue: string | null;
    confirmed: boolean;
  }[];
};

export type MillQualitiesHttpResult =
  | { status: 200; surface: FrumaVersion; body: ActiveMaterialQuality[] }
  | { status: 401; surface: FrumaVersion; body: { error: string } };

function cookieNamed(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

function depositedCell(row: JoinedSourceCell): SourceCell {
  return {
    pointer: {
      sheet: row.cell.sheetName,
      row: row.cell.rowIndex,
      column: columnLetter(row.cell.colIndex - 1),
    },
    sourceValue: row.cell.sourceValue,
    header: row.cell.rawHeader,
    ...(row.cell.normalizedValue != null ? { normalizedValue: row.cell.normalizedValue } : {}),
  };
}

/**
 * Replay map/confirm events in occurred_at order onto the immutable source cell.
 * sourceValue stays the mill text. The latest map supplies standardValue.
 */
export function replayActiveCell(row: JoinedSourceCell): SourceCell {
  const events = [...row.mutations].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  return resolveActiveCell(depositedCell(row), events);
}

function activeQualities(rows: JoinedSourceCell[], quality: string | null): ActiveMaterialQuality[] {
  const byDeposit = new Map<string, { supplierOrgId: string; cells: SourceCell[] }>();
  for (const row of rows) {
    const active = replayActiveCell(row);
    const group = byDeposit.get(row.cell.depositId) ?? {
      supplierOrgId: row.supplierOrgId,
      cells: [],
    };
    group.cells.push(active);
    byDeposit.set(row.cell.depositId, group);
  }

  const qualities: ActiveMaterialQuality[] = [];
  for (const [depositId, group] of byDeposit) {
    const built = qualitiesFromCells({
      supplierOrgId: group.supplierOrgId,
      depositId,
      cells: group.cells,
    });
    for (const qualityRow of built.qualities) {
      qualities.push({
        id: qualityRow.id,
        supplierOrgId: qualityRow.supplierOrgId,
        millArticleCode: qualityRow.millArticleCode,
        depositId: qualityRow.depositId,
        visibility: qualityRow.visibility,
        colourways: qualityRow.colourways.map((colourway) => ({
          id: colourway.id,
          colourAsWritten: colourway.colourAsWritten,
        })),
        widths: qualityRow.widths.map((width) => ({ valueAsWritten: width.valueAsWritten })),
        cells: qualityRow.cells.map((cell) => ({
          sheet: cell.pointer.sheet,
          row: cell.pointer.row,
          column: cell.pointer.column,
          header: cell.header,
          sourceValue: cell.sourceValue,
          standardField: cell.standardField ?? null,
          standardValue: cell.standardValue ?? null,
          normalizedValue: cell.normalizedValue ?? null,
          confirmed: cell.confirmed === true,
        })),
      });
    }
  }

  qualities.sort((a, b) => a.depositId.localeCompare(b.depositId) || a.id.localeCompare(b.id));
  const needle = quality?.trim();
  if (!needle) return qualities;
  return qualities.filter((row) => row.id === needle || row.millArticleCode === needle);
}

function assertNoFileBytes(value: unknown): void {
  if (value instanceof Uint8Array) {
    throw new Error("Mill qualities payload included file bytes.");
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoFileBytes(item);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "bytes") throw new Error("Mill qualities payload included file bytes.");
    assertNoFileBytes(child);
  }
}

export async function handleMillQualitiesRequest(request: Request): Promise<MillQualitiesHttpResult> {
  const surface = surfaceFromRequest(request);
  const who = await sessionFounder(cookieNamed(request, DEMO_COOKIE));
  if (!who) {
    return { status: 401, surface, body: { error: "Sign in to read mill qualities." } };
  }

  const url = new URL(request.url);
  const depositId = url.searchParams.get("depositId") ?? url.searchParams.get("deposit");
  const quality = url.searchParams.get("quality");
  const store = getSpineStore(surface);
  const rows = await store.listSourceCellsWithMutations(
    depositId?.trim() ? { depositId: depositId.trim() } : undefined,
  );
  const body = activeQualities(rows, quality);
  assertNoFileBytes(body);
  return { status: 200, surface, body };
}
