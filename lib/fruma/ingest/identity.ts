import { IngestException } from "./exceptions";
import type {
  BaseQuality,
  Colourway,
  RowException,
  SourceCell,
  StandardField,
  WidthAttribute,
} from "./types";
import { VISIBILITY_PRIVATE } from "./types";

export function articleAsWritten(value: string): string | null {
  if (value === "") return null;
  if (value.trim() === "") return null;
  return value;
}

export function baseQualityId(supplierOrgId: string, millArticleCode: string): string {
  const code = articleAsWritten(millArticleCode);
  if (code === null) {
    throw new IngestException(
      "empty_article",
      "Empty article is an exception; ingest will not generate an id.",
    );
  }
  return `bq:${supplierOrgId}:${code}`;
}

export function colourwayId(parentId: string, colourAsWritten: string): string {
  return `cw:${parentId}:${colourAsWritten}`;
}

function cellValue(cells: SourceCell[], field: StandardField): SourceCell | undefined {
  return cells.find((c) => c.standardField === field);
}

function rowHasUnmappedHeader(cells: SourceCell[]): boolean {
  return cells.some((cell) => cell.header.trim() && !cell.standardField);
}

/** One exception per mill header that never attached to the Fruma standard. */
export function unknownHeaderExceptions(cells: SourceCell[]): RowException[] {
  const firstByHeader = new Map<string, SourceCell>();
  for (const cell of cells) {
    const header = cell.header.trim();
    if (!header || cell.standardField) continue;
    if (!firstByHeader.has(header)) firstByHeader.set(header, cell);
  }
  return [...firstByHeader.entries()].map(([header, cell]) => ({
    code: "unknown_header",
    message: `Mill header “${header}” is not on the Fruma standard. Mapping work — not a blank article.`,
    pointer: cell.pointer,
  }));
}

export function qualitiesFromCells(input: {
  supplierOrgId: string;
  depositId: string;
  cells: SourceCell[];
}): { qualities: BaseQuality[]; exceptions: RowException[] } {
  const byRow = new Map<string, SourceCell[]>();
  for (const cell of input.cells) {
    const key = `${cell.pointer.sheet}:${cell.pointer.row}`;
    const list = byRow.get(key) ?? [];
    list.push(cell);
    byRow.set(key, list);
  }

  const qualities = new Map<string, BaseQuality>();
  const exceptions: RowException[] = unknownHeaderExceptions(input.cells);

  for (const rowCells of byRow.values()) {
    const articleCell = cellValue(rowCells, "article");
    if (!articleCell) {
      // Unmapped identity is mapping work. Do not pretend the article was blank.
      if (rowHasUnmappedHeader(rowCells)) continue;
      exceptions.push({
        code: "empty_article",
        message: "Empty article is an exception; ingest will not generate an id.",
        pointer: rowCells[0]?.pointer,
      });
      continue;
    }
    const written = articleAsWritten(articleCell.sourceValue);
    if (written === null) {
      exceptions.push({
        code: "empty_article",
        message: "Empty article is an exception; ingest will not generate an id.",
        pointer: articleCell.pointer,
      });
      continue;
    }

    const id = baseQualityId(input.supplierOrgId, written);
    const existing = qualities.get(id) ?? {
      id,
      supplierOrgId: input.supplierOrgId,
      millArticleCode: written,
      visibility: VISIBILITY_PRIVATE,
      depositId: input.depositId,
      colourways: [] as Colourway[],
      widths: [] as WidthAttribute[],
      cells: [] as SourceCell[],
      certs: [],
    };

    existing.cells.push(...rowCells);

    const colourCell = cellValue(rowCells, "colour");
    const colour = colourCell?.sourceValue ?? "";
    if (colour !== "" && !existing.colourways.some((c) => c.colourAsWritten === colour)) {
      existing.colourways.push({
        id: colourwayId(id, colour),
        baseQualityId: id,
        colourAsWritten: colour,
        sourceCell: colourCell!,
      });
    }

    const widthCell = cellValue(rowCells, "width");
    const width = widthCell?.sourceValue ?? "";
    if (width !== "" && !existing.widths.some((w) => w.valueAsWritten === width)) {
      existing.widths.push({
        valueAsWritten: width,
        sourceCell: widthCell!,
      });
    }

    qualities.set(id, existing);
  }

  return { qualities: [...qualities.values()], exceptions };
}
