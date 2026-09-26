import type { SourceCell, StandardField } from "../ingest/types";

/**
 * Point back to the mill cell that justified a fact.
 * Never invent a value — only cite what was written.
 */
export type FieldCitation = {
  field: StandardField;
  header: string;
  sourceValue: string;
  sheet: string;
  row: number;
  column: string;
  /** Mill file as deposited. */
  filename?: string;
  depositId?: string;
};

export function citationFromCell(
  cell: SourceCell,
  field: StandardField,
  meta?: { filename?: string; depositId?: string },
): FieldCitation {
  return {
    field,
    header: cell.header,
    sourceValue: cell.sourceValue,
    sheet: cell.pointer.sheet,
    row: cell.pointer.row,
    column: cell.pointer.column,
    filename: meta?.filename,
    depositId: meta?.depositId,
  };
}

export function formatCitation(c: FieldCitation): string {
  const file = c.filename ? `${c.filename} · ` : "";
  return `${file}${c.sheet}!${c.column}${c.row} · “${c.header}” = ${c.sourceValue}`;
}
