import { resolveHeaderField } from "./header-map";
import { columnLetter } from "./columns";
import { resolveActiveCell } from "./cell-mutations";
import type { JoinedSourceCell } from "../persist/types";
import type { SourceCell, StandardField } from "./types";

/**
 * One source cell after header resolution and a chronological replay of
 * `fruma_cell_mutation_events`. Nothing here is written back to the ledger.
 */
export type LedgerCellState = {
  id: string;
  depositId: string;
  sheet: string;
  row: number;
  column: string;
  header: string;
  sourceValue: string;
  standardField: StandardField | null;
  standardValue: string | null;
  normalizedValue: string | null;
  confirmed: boolean;
};

/** A cell the parser or a later map left unmapped, or mapped and still unconfirmed. */
export type SupplierParsingAnomaly = LedgerCellState & {
  reason: "unmapped" | "unconfirmed";
};

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
 * Final cell = immutable source row, the active header map, then each mutation
 * in `occurred_at` order. `sourceValue` stays the mill text.
 */
export function replayLedgerCell(
  row: JoinedSourceCell,
  overlays?: Record<string, StandardField>,
): LedgerCellState {
  const deposited = depositedCell(row);
  const parsedField = resolveHeaderField(deposited.header, overlays);
  const seeded: SourceCell = parsedField ? { ...deposited, standardField: parsedField } : deposited;
  const active = resolveActiveCell(seeded, row.mutations);
  return {
    id: row.cell.id,
    depositId: row.cell.depositId,
    sheet: active.pointer.sheet,
    row: active.pointer.row,
    column: active.pointer.column,
    header: active.header,
    sourceValue: active.sourceValue,
    standardField: active.standardField ?? null,
    standardValue: active.standardValue ?? null,
    normalizedValue: active.normalizedValue ?? null,
    confirmed: active.confirmed === true,
  };
}

function anomalyReason(cell: LedgerCellState): SupplierParsingAnomaly["reason"] | null {
  if (!cell.standardField) return "unmapped";
  if (!cell.confirmed) return "unconfirmed";
  return null;
}

/** Cells that remain unmapped or unconfirmed after the chronological replay. */
export function supplierParsingAnomalies(
  rows: readonly JoinedSourceCell[],
  overlays?: Record<string, StandardField>,
): SupplierParsingAnomaly[] {
  const anomalies: SupplierParsingAnomaly[] = [];
  for (const row of rows) {
    const cell = replayLedgerCell(row, overlays);
    const reason = anomalyReason(cell);
    if (!reason) continue;
    anomalies.push({ ...cell, reason });
  }
  anomalies.sort(
    (a, b) =>
      a.depositId.localeCompare(b.depositId) ||
      a.sheet.localeCompare(b.sheet) ||
      a.row - b.row ||
      a.column.localeCompare(b.column) ||
      a.id.localeCompare(b.id),
  );
  return anomalies;
}

export function isSupplierParsingAnomaly(value: unknown): value is SupplierParsingAnomaly {
  if (!value || typeof value !== "object") return false;
  const row = value as SupplierParsingAnomaly;
  return (
    typeof row.id === "string" &&
    typeof row.depositId === "string" &&
    typeof row.sheet === "string" &&
    typeof row.row === "number" &&
    typeof row.column === "string" &&
    typeof row.header === "string" &&
    typeof row.sourceValue === "string" &&
    (row.standardField === null || typeof row.standardField === "string") &&
    (row.standardValue === null || typeof row.standardValue === "string") &&
    (row.normalizedValue === null || typeof row.normalizedValue === "string") &&
    typeof row.confirmed === "boolean" &&
    (row.reason === "unmapped" || row.reason === "unconfirmed")
  );
}
