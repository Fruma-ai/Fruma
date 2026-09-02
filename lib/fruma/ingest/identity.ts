import { IngestException } from "./exceptions";
import type {
  BaseQuality,
  Colourway,
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

export function qualitiesFromCells(input: {
  supplierOrgId: string;
  depositId: string;
  cells: SourceCell[];
}): { qualities: BaseQuality[]; exceptions: { code: "empty_article"; message: string; pointer?: SourceCell["pointer"] }[] } {
  const byRow = new Map<string, SourceCell[]>();
  for (const cell of input.cells) {
    const key = `${cell.pointer.sheet}:${cell.pointer.row}`;
    const list = byRow.get(key) ?? [];
    list.push(cell);
    byRow.set(key, list);
  }

  const qualities = new Map<string, BaseQuality>();
  const exceptions: { code: "empty_article"; message: string; pointer?: SourceCell["pointer"] }[] = [];

  for (const rowCells of byRow.values()) {
    const articleCell = cellValue(rowCells, "article");
    const written = articleCell ? articleAsWritten(articleCell.sourceValue) : null;
    if (written === null) {
      exceptions.push({
        code: "empty_article",
        message: "Empty article is an exception; ingest will not generate an id.",
        pointer: articleCell?.pointer ?? rowCells[0]?.pointer,
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
