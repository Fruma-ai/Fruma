import { articleAsWritten } from "../ingest/identity";
import type { SourceCell } from "../ingest/types";

export type QualityRow = {
  id: string;
  articleCode: string;
  fieldName: string;
  sourceValue: string;
  standardValue: string | null;
  isConfirmed: boolean;
  /** Workbook address, for example Sheet1!Row4!ColC. */
  coordinates: string;
};

export function qualityRowsFromCells(depositId: string, cells: SourceCell[]): QualityRow[] {
  const articleByRow = new Map<string, string>();
  for (const cell of cells) {
    if (cell.standardField !== "article") continue;
    const written = articleAsWritten(cell.sourceValue);
    if (!written) continue;
    articleByRow.set(rowKey(cell), written);
  }

  const rows: QualityRow[] = [];
  for (const cell of cells) {
    if (cell.sourceValue.trim() === "") continue;
    const standard = cell.standardValue?.trim() ?? "";
    const { sheet, row, column } = cell.pointer;
    rows.push({
      id: `${depositId}:${sheet}:${row}:${column}`,
      articleCode: articleByRow.get(rowKey(cell)) ?? "—",
      fieldName: cell.standardField ?? cell.header,
      sourceValue: cell.sourceValue,
      standardValue: standard === "" ? null : standard,
      isConfirmed: cell.confirmed === true,
      coordinates: `${sheet}!Row${row}!Col${column}`,
    });
  }
  return rows;
}

function rowKey(cell: SourceCell): string {
  return `${cell.pointer.sheet}:${cell.pointer.row}`;
}
