import type { FieldResolver } from "./quality-rows";
import { cellRowId, fabricRowKey } from "./quality-rows";
import { articleAsWritten } from "../ingest/identity";
import type { SourceCell, StandardField } from "../ingest/types";
import { proposeFieldForHeader } from "../intelligence/mapping-lexicon";

export function catalogFieldResolver(
  overlays?: Record<string, StandardField>,
): FieldResolver {
  return (cell) => {
    if (cell.standardField) return cell.standardField;
    return proposeFieldForHeader(cell.header, [], overlays).proposedField ?? undefined;
  };
}

/** Fields a matched fabric still has to fill before it meets the standard. */
export const REQUIRED_STANDARD_FIELDS = [
  "article",
  "construction",
  "composition",
  "weight",
  "width",
  "colour",
] as const satisfies readonly StandardField[];

export type RequiredStandardField = (typeof REQUIRED_STANDARD_FIELDS)[number];

export type GapField = RequiredStandardField | "cert";

export const STANDARD_FIELD_LABEL: Record<GapField, string> = {
  article: "Article",
  construction: "Construction",
  composition: "Composition",
  weight: "Weight",
  width: "Width",
  colour: "Colour",
  cert: "Cert",
};

const GSM_PER_OZ = 33.906;
const CM_PER_INCH = 2.54;

export type StandardGap = {
  id: string;
  rowKey: string;
  cellId: string | null;
  articleCode: string;
  field: GapField;
  coordinates: string | null;
  sourceValue: string;
  suggestion: string | null;
  reason: string;
};

export type StandardSuggestion = {
  value: string | null;
  reason: string;
};

export function suggestStandardValue(
  field: RequiredStandardField,
  sourceValue: string,
  header = "",
): StandardSuggestion {
  const source = sourceValue.trim();
  const head = header.trim();
  if (!source) {
    return { value: null, reason: "No mill text for this field. Write the standard value." };
  }
  if (field === "article") {
    return { value: source, reason: "Article code as written." };
  }
  if (field === "colour") return suggestColour(source);
  if (field === "construction") return suggestConstruction(source);
  if (field === "composition") return suggestComposition(source);
  if (field === "weight") return suggestWeight(source, head);
  return suggestWidth(source, head);
}

export function standardGapsFromCells(
  depositId: string,
  cells: SourceCell[],
  resolveField?: FieldResolver,
): StandardGap[] {
  const fieldOf = (cell: SourceCell) => cell.standardField ?? resolveField?.(cell);
  const byRow = new Map<string, SourceCell[]>();
  for (const cell of cells) {
    const key = fabricRowKey(depositId, cell.pointer.sheet, cell.pointer.row);
    const list = byRow.get(key) ?? [];
    list.push(cell);
    byRow.set(key, list);
  }

  const gaps: StandardGap[] = [];
  for (const [rowKey, rowCells] of byRow) {
    const articleCell = rowCells.find((cell) => fieldOf(cell) === "article");
    const articleCode = articleCell ? articleAsWritten(articleCell.sourceValue) : null;
    if (!articleCode) continue;

    for (const field of REQUIRED_STANDARD_FIELDS) {
      const cell = rowCells.find((item) => fieldOf(item) === field);
      const settled = cell?.standardValue?.trim() ?? "";
      if (settled) continue;
      const sourceValue = cell?.sourceValue?.trim() ?? "";
      const suggestion = suggestStandardValue(field, sourceValue, cell?.header ?? "");
      gaps.push(gapFor(rowKey, articleCode, field, cell, depositId, sourceValue, suggestion));
    }

    const cert = rowCells.find((item) => fieldOf(item) === "cert");
    const certSource = cert?.sourceValue?.trim() ?? "";
    const certSettled = cert?.standardValue?.trim() ?? "";
    if (cert && certSource && !certSettled) {
      gaps.push(
        gapFor(rowKey, articleCode, "cert", cert, depositId, certSource, {
          value: certSource,
          reason: "Cert as written. Nothing is added that the mill did not write.",
        }),
      );
    }
  }
  return gaps;
}

function gapFor(
  rowKey: string,
  articleCode: string,
  field: StandardGap["field"],
  cell: SourceCell | undefined,
  depositId: string,
  sourceValue: string,
  suggestion: StandardSuggestion,
): StandardGap {
  const pointer = cell?.pointer;
  return {
    id: `${rowKey}:${field}`,
    rowKey,
    cellId: cell ? cellRowId(depositId, cell) : null,
    articleCode,
    field,
    coordinates: pointer ? `${pointer.sheet}!Row${pointer.row}!Col${pointer.column}` : null,
    sourceValue,
    suggestion: suggestion.value,
    reason: suggestion.reason,
  };
}

function suggestColour(source: string): StandardSuggestion {
  const known: Record<string, string> = {
    navy: "Navy",
    nvy: "Navy",
    white: "White",
    wht: "White",
    ecru: "Ecru",
    charcoal: "Charcoal",
    chr: "Charcoal",
    black: "Black",
    blk: "Black",
  };
  const hit = known[source.toLowerCase()];
  if (hit) return { value: hit, reason: "Colour as written." };
  if (/^[A-Za-z][A-Za-z .'-]{0,40}$/.test(source)) {
    return {
      value: source.replace(/\w+/g, (word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase()),
      reason: "Colour as written.",
    };
  }
  return { value: null, reason: "Colour text is not a single name. Write the standard colour." };
}

function suggestConstruction(source: string): StandardSuggestion {
  const text = source.toLowerCase();
  const known: [RegExp, string][] = [
    [/mesh/, "mesh"],
    [/piqu/, "pique"],
    [/waffle/, "waffle"],
    [/interlock/, "interlock"],
    [/terry/, "french terry"],
    [/loopback/, "loopback"],
    [/s\/j|single jersey|jersey/, "single jersey"],
    [/2\s*[x×]\s*2/, "rib 2x2"],
    [/rib/, "rib 1x1"],
    [/slub/, "slub jersey"],
    [/twill/, "twill"],
    [/cord/, "corduroy"],
  ];
  for (const [pattern, value] of known) {
    if (pattern.test(text)) {
      return { value, reason: "Knit words in the mill text." };
    }
  }
  return { value: null, reason: "No known knit in the mill text. Write the construction." };
}

function suggestComposition(source: string): StandardSuggestion {
  if (/gots/i.test(source)) {
    return {
      value: tidyComposition(source.replace(/gots/gi, "").replace(/\s{2,}/g, " ")),
      reason: "Fibre text only. A cert name is not added to composition.",
    };
  }
  const value = tidyComposition(source);
  if (!value) return { value: null, reason: "No fibre text to suggest. Write the composition." };
  return { value, reason: "Mill fibre text, with common abbreviations expanded." };
}

function tidyComposition(source: string): string {
  let text = source;
  const replacements: [RegExp, string][] = [
    [/\borganic cotton\b/gi, "organic cotton"],
    [/\bsupima\b/gi, "supima"],
    [/\bcotton\b/gi, "cotton"],
    [/\bpolyester\b/gi, "polyester"],
    [/\belastane\b/gi, "elastane"],
    [/\bspandex\b/gi, "spandex"],
    [/\bviscose\b/gi, "viscose"],
    [/\bnylon\b/gi, "nylon"],
    [/\bwool\b/gi, "wool"],
    [/\bCOTTON\b/g, "cotton"],
    [/\bCO\b/g, "cotton"],
    [/\bPES\b/g, "polyester"],
    [/\bSPN\b/g, "elastane"],
    [/\bEA\b/g, "elastane"],
    [/\bEL\b/g, "elastane"],
    [/\bCV\b/g, "viscose"],
    [/\bPA\b/g, "nylon"],
    [/\bWO\b/g, "wool"],
  ];
  for (const [pattern, next] of replacements) text = text.replace(pattern, next);
  return text.replace(/\s+/g, " ").replace(/\s+([/,])/g, " $1").trim();
}

function suggestWeight(source: string, header: string): StandardSuggestion {
  const amount = firstNumber(source);
  if (amount === null) {
    return { value: null, reason: "No weight number in the mill text. Write g/m²." };
  }
  if (/oz/i.test(source) || /oz/i.test(header)) {
    const gsm = Math.round(amount * GSM_PER_OZ);
    return { value: `${gsm} g/m²`, reason: "Ounces converted at 33.906 g/m² per oz." };
  }
  if (/g\/m|gsm/i.test(source) || /g\/m|gsm/i.test(header)) {
    return { value: `${roundMeasure(amount)} g/m²`, reason: "Number under a GSM header, written as g/m²." };
  }
  return { value: null, reason: "Weight has no unit. Write g/m² or ounces." };
}

function suggestWidth(source: string, header: string): StandardSuggestion {
  const amount = firstNumber(source);
  if (amount === null) {
    return { value: null, reason: "No width number in the mill text. Write centimetres." };
  }
  if (/inch|in\b|"/i.test(source) || /inch|in\b|"/i.test(header)) {
    return {
      value: `${Math.round(amount * CM_PER_INCH)} cm`,
      reason: "Inches converted at 2.54 cm.",
    };
  }
  if (/cm/i.test(source) || /cm/i.test(header)) {
    return { value: `${roundMeasure(amount)} cm`, reason: "Number under a centimetre header." };
  }
  return { value: null, reason: "Width has no unit. Write centimetres or inches." };
}

function firstNumber(source: string): number | null {
  const match = source.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function roundMeasure(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 10) / 10);
}
