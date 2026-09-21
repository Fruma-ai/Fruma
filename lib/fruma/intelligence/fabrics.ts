import { parseCsvBytes } from "../ingest/parse-csv";
import type { SourceCell, StandardField } from "../ingest/types";
import { citationFromCell, type FieldCitation } from "../pilot/citations";
import { PROPOSAL_LEXICON } from "./mapping-lexicon";
import { resolveHeaderField } from "../ingest/header-map";
import { hangerBytesFor } from "../test-corpus/hanger";
import type { TestFactory } from "../test-corpus/types";

/**
 * End-product families that mill *cloth* can support.
 * Mills submit fabrics and materials — never a product catalogue.
 */
export const END_PRODUCT_FAMILIES = [
  "Polo",
  "T-shirt",
  "Sweater",
  "Shirt",
  "Jacket",
  "Trouser",
  "Overshirt",
  "Sweat",
] as const;

export type EndProductFamily = (typeof END_PRODUCT_FAMILIES)[number];

const END_PRODUCT_RULES: {
  family: EndProductFamily;
  construction: RegExp[];
  fibre?: RegExp[];
}[] = [
  { family: "Polo", construction: [/pique/i, /mesh/i, /interlock/i, /s\/j/i] },
  { family: "T-shirt", construction: [/s\/j/i, /interlock/i, /jersey/i] },
  { family: "Sweater", construction: [/rib/i, /interlock/i], fibre: [/wool/i, /merino/i] },
  { family: "Shirt", construction: [/poplin/i, /oxford/i] },
  { family: "Jacket", construction: [/twill/i, /fleece/i, /coating/i] },
  { family: "Trouser", construction: [/twill/i] },
  { family: "Overshirt", construction: [/twill/i, /oxford/i] },
  { family: "Sweat", construction: [/fleece/i, /terry/i, /loopback/i] },
];

export type FabricQuality = {
  factoryId: string;
  articleCode: string;
  constructionAsWritten: string;
  compositionAsWritten: string;
  weightAsWritten: string;
  widthAsWritten: string;
  colourAsWritten: string;
  moqAsWritten: string;
  constructionMapped: boolean;
  compositionMapped: boolean;
  /** Read from mill wording. Not a mill product SKU. */
  possibleEndProducts: EndProductFamily[];
  /** Mill cells that justified each mapped field. Empty when nothing on file. */
  citations?: FieldCitation[];
};

export type EndProductSupport = {
  family: EndProductFamily;
  qualityCount: number;
};

export type FabricBook = {
  factoryId: string;
  factoryName: string;
  dialect: string;
  millSubmits: "fabrics-and-materials";
  qualities: FabricQuality[];
  endProductSupport: EndProductSupport[];
};

function cellsByRow(cells: SourceCell[]): SourceCell[][] {
  const map = new Map<string, SourceCell[]>();
  for (const cell of cells) {
    const key = `${cell.pointer.sheet}:${cell.pointer.row}`;
    const list = map.get(key) ?? [];
    list.push(cell);
    map.set(key, list);
  }
  return [...map.values()];
}

function valueFor(
  row: SourceCell[],
  field: StandardField,
  overlays?: Record<string, StandardField>,
): { value: string; mapped: boolean; cell?: SourceCell } {
  const mapped = row.find((c) => c.standardField === field);
  if (mapped) return { value: mapped.sourceValue, mapped: true, cell: mapped };
  const fallback = row.find((c) => {
    const resolved = resolveHeaderField(c.header, overlays) ?? PROPOSAL_LEXICON[c.header.trim().toLowerCase()];
    return resolved === field;
  });
  return { value: fallback?.sourceValue ?? "", mapped: false, cell: fallback };
}

export function endProductsFromCloth(construction: string, composition: string): EndProductFamily[] {
  const out: EndProductFamily[] = [];
  for (const rule of END_PRODUCT_RULES) {
    const constructionHit = rule.construction.some((re) => re.test(construction));
    if (!constructionHit) continue;
    if (rule.fibre && !rule.fibre.some((re) => re.test(composition))) continue;
    out.push(rule.family);
  }
  return out;
}

export function categoryToEndProduct(category: string): EndProductFamily | null {
  const key = category.trim().toLowerCase();
  if (key === "polo") return "Polo";
  if (key === "t-shirt" || key === "tee") return "T-shirt";
  if (key === "sweater") return "Sweater";
  if (key === "shirt") return "Shirt";
  if (key === "jacket") return "Jacket";
  if (key === "trouser") return "Trouser";
  if (key === "overshirt") return "Overshirt";
  if (key === "dress") return "T-shirt";
  return null;
}

export function fabricBookFor(
  factory: TestFactory,
  overlays?: Record<string, StandardField>,
): FabricBook {
  const cells = parseCsvBytes(factory.filename, hangerBytesFor(factory), overlays);
  const qualities: FabricQuality[] = [];

  for (const row of cellsByRow(cells)) {
    const article = valueFor(row, "article", overlays);
    if (!article.value) continue;
    const construction = valueFor(row, "construction", overlays);
    const composition = valueFor(row, "composition", overlays);
    const weight = valueFor(row, "weight", overlays);
    const width = valueFor(row, "width", overlays);
    const colour = valueFor(row, "colour", overlays);
    const moq = valueFor(row, "moq", overlays);
    const citations: FieldCitation[] = [];
    const meta = { filename: factory.filename };
    for (const [field, part] of [
      ["article", article],
      ["construction", construction],
      ["composition", composition],
      ["weight", weight],
      ["width", width],
      ["colour", colour],
      ["moq", moq],
    ] as const) {
      if (part.cell) citations.push(citationFromCell(part.cell, field, meta));
    }
    qualities.push({
      factoryId: factory.id,
      articleCode: article.value,
      constructionAsWritten: construction.value,
      compositionAsWritten: composition.value,
      weightAsWritten: weight.value,
      widthAsWritten: width.value,
      colourAsWritten: colour.value,
      moqAsWritten: moq.value,
      constructionMapped: construction.mapped,
      compositionMapped: composition.mapped,
      possibleEndProducts: endProductsFromCloth(construction.value, composition.value),
      citations,
    });
  }

  const counts = new Map<EndProductFamily, number>();
  for (const quality of qualities) {
    for (const family of quality.possibleEndProducts) {
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }
  }

  return {
    factoryId: factory.id,
    factoryName: factory.name,
    dialect: factory.dialect,
    millSubmits: "fabrics-and-materials",
    qualities,
    endProductSupport: END_PRODUCT_FAMILIES.filter((family) => counts.has(family)).map((family) => ({
      family,
      qualityCount: counts.get(family) ?? 0,
    })),
  };
}

export function fabricsMatchingEndProduct(
  book: FabricBook,
  family: EndProductFamily,
  colour?: string | null,
): FabricQuality[] {
  const needle = colour?.toLowerCase();
  return book.qualities.filter((quality) => {
    if (!quality.possibleEndProducts.includes(family)) return false;
    if (needle && quality.colourAsWritten && !quality.colourAsWritten.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });
}
