import { articleAsWritten } from "../ingest/identity";
import type { SourceCell, StandardField } from "../ingest/types";

export type QualityRow = {
  id: string;
  rowKey: string;
  articleCode: string;
  fieldName: string;
  sourceValue: string;
  standardValue: string | null;
  isConfirmed: boolean;
  /** Workbook address, for example Sheet1!Row4!ColC. */
  coordinates: string;
};

export type FieldResolver = (cell: SourceCell) => StandardField | undefined;

export function cellRowId(depositId: string, cell: SourceCell): string {
  const { sheet, row, column } = cell.pointer;
  return `${depositId}:${sheet}:${row}:${column}`;
}

export function fabricRowKey(depositId: string, sheet: string, row: number): string {
  return `${depositId}:${sheet}:${row}`;
}

export function qualityRowsFromCells(
  depositId: string,
  cells: SourceCell[],
  resolveField?: FieldResolver,
): QualityRow[] {
  const fieldOf = (cell: SourceCell) => cell.standardField ?? resolveField?.(cell);
  const articleByRow = new Map<string, string>();
  for (const cell of cells) {
    if (fieldOf(cell) !== "article") continue;
    const written = articleAsWritten(cell.sourceValue);
    if (!written) continue;
    articleByRow.set(fabricRowKey(depositId, cell.pointer.sheet, cell.pointer.row), written);
  }

  const rows: QualityRow[] = [];
  for (const cell of cells) {
    if (cell.sourceValue.trim() === "") continue;
    const standard = cell.standardValue?.trim() ?? "";
    const { sheet, row } = cell.pointer;
    const key = fabricRowKey(depositId, sheet, row);
    rows.push({
      id: cellRowId(depositId, cell),
      rowKey: key,
      articleCode: articleByRow.get(key) ?? "—",
      fieldName: cell.standardField ?? cell.header,
      sourceValue: cell.sourceValue,
      standardValue: standard === "" ? null : standard,
      isConfirmed: cell.confirmed === true,
      coordinates: `${sheet}!Row${row}!Col${cell.pointer.column}`,
    });
  }
  return rows;
}
