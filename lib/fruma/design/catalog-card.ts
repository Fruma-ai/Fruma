/** Same multiplier the search rerank applies when EU DPP certificates are ready. */
const DPP_READY_COEFFICIENT = 1.25;

const NAMED_SWATCHES: Record<string, string> = {
  navy: "#1B2A4A",
  ecru: "#F2E8D5",
  black: "#161619",
  white: "#F5F5F7",
  ivory: "#F4EFE4",
  red: "#B42318",
  blue: "#3B82F6",
  green: "#047857",
  grey: "#6E7E91",
  gray: "#6E7E91",
  beige: "#D6C6A5",
  brown: "#6B4423",
};

export type CatalogColorway = {
  name: string;
  dyeLot: string;
  hex: string;
};

export type HistoricalProductMatch = {
  productName: string;
  seasonCode: string;
  warehouseLocation: string;
};

/** One brand PLM style recalled for a material card. */
export type PriorDevelopmentRecall = {
  article_code: string;
  last_ordered_at: string;
};

export type UniformMaterialCard = {
  id: string;
  articleCode: string;
  construction: string;
  normalizedGsm: string;
  normalizedWidth: string;
  composition: string;
  colorways: CatalogColorway[];
  hasDppProof: boolean;
  complianceWarning?: string;
  historicalProductMatch?: HistoricalProductMatch | null;
  priorDevelopments?: readonly PriorDevelopmentRecall[];
};

export type CatalogSearchCell = {
  standardField?: string | null;
  sourceValue?: string;
  standardValue?: string | null;
  normalizedValue?: string | null;
};

export type CatalogSearchColourway = {
  id?: string;
  colourAsWritten?: string;
};

export type CatalogSearchHit = {
  id: string;
  millArticleCode: string;
  cosineDistance: number;
  score?: number;
  compliance_warning?: { message?: string };
  cells?: CatalogSearchCell[];
  colourways?: CatalogSearchColourway[];
  historicalProductMatch?: HistoricalProductMatch | null;
  historicalArticles?: readonly { articleCode: string; lastOrderedAt: string }[];
};

/** Keep the latest non-blank style code from the vector-search history array. */
export function priorDevelopmentsFor(
  articles: readonly { articleCode: string; lastOrderedAt: string }[] | undefined,
): PriorDevelopmentRecall[] {
  const seen = new Set<string>();
  const recalls: PriorDevelopmentRecall[] = [];
  for (const article of articles ?? []) {
    const article_code = article.articleCode.trim();
    const last_ordered_at = article.lastOrderedAt.trim();
    if (!article_code || seen.has(article_code)) continue;
    seen.add(article_code);
    recalls.push({ article_code, last_ordered_at });
  }
  return recalls;
}

function historicalMatch(
  value: HistoricalProductMatch | null | undefined,
): HistoricalProductMatch | null | undefined {
  if (value == null) return value;
  const productName = value.productName.trim();
  const seasonCode = value.seasonCode.trim();
  const warehouseLocation = value.warehouseLocation.trim();
  if (!productName || !seasonCode || !warehouseLocation) return undefined;
  return { productName, seasonCode, warehouseLocation };
}

function fieldValue(cells: CatalogSearchCell[] | undefined, field: string): string {
  const cell = cells?.find((row) => row.standardField === field);
  const value = cell?.normalizedValue?.trim() || cell?.standardValue?.trim() || cell?.sourceValue?.trim() || "";
  return value || "—";
}

export function swatchHex(name: string): string {
  const key = name.trim().toLowerCase();
  const named = NAMED_SWATCHES[key];
  if (named) return named;
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 38% 42%)`;
}

/** A pass is the rerank boost with no EU DPP warning on the quality. */
export function hasEuDppPass(hit: Pick<CatalogSearchHit, "cosineDistance" | "score" | "compliance_warning">): boolean {
  if (hit.compliance_warning) return false;
  if (typeof hit.score !== "number" || !Number.isFinite(hit.score) || !Number.isFinite(hit.cosineDistance)) {
    return false;
  }
  const similarity = 1 - hit.cosineDistance;
  if (similarity <= 0) return false;
  return Math.abs(hit.score / similarity - DPP_READY_COEFFICIENT) < 0.02;
}

export function uniformMaterialFromHit(hit: CatalogSearchHit): UniformMaterialCard {
  const colorways = (hit.colourways ?? []).flatMap((row) => {
    const name = row.colourAsWritten?.trim() ?? "";
    if (!name) return [];
    return [{ name, dyeLot: row.id?.trim() || name, hex: swatchHex(name) }];
  });
  return {
    id: hit.id,
    articleCode: hit.millArticleCode.trim() || "UNMAPPED_ARTICLE",
    construction: fieldValue(hit.cells, "construction"),
    normalizedGsm: fieldValue(hit.cells, "weight"),
    normalizedWidth: fieldValue(hit.cells, "width"),
    composition: fieldValue(hit.cells, "composition"),
    colorways,
    hasDppProof: hasEuDppPass(hit),
    historicalProductMatch: historicalMatch(hit.historicalProductMatch),
    ...(hit.compliance_warning?.message?.trim()
      ? { complianceWarning: hit.compliance_warning.message.trim() }
      : {}),
  };
}
