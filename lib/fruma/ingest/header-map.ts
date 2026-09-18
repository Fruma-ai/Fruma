import type { StandardField } from "./types";

/**
 * Deterministic mill header → Fruma standard field.
 * Covers the six Test corpus dialects so hangers land as searchable qualities
 * before the Mapping agent proposes overlays for unknowns.
 */
export const BUILTIN_HEADER_TO_FIELD: Record<string, StandardField> = {
  // Shared / pt-standard / messy-mixed
  article: "article",
  "article code": "article",
  "fabric no": "article",
  "mill article code": "article",
  "art.": "article",
  construction: "construction",
  structure: "construction",
  weave: "construction",
  "knit type": "construction",
  composition: "composition",
  "comp.": "composition",
  fibre: "composition",
  weight: "weight",
  "wgt gsm": "weight",
  gsm: "weight",
  "weight oz": "weight",
  width: "width",
  "usable width": "width",
  "width cm": "width",
  'width "': "width",
  colour: "colour",
  color: "colour",
  colours: "colour",
  colors: "colour",
  colourway: "colour",
  moq: "moq",
  "min order": "moq",
  "moq m": "moq",
  "moq yds": "moq",
  customer: "customer",
  buyer: "customer",
  "customer ref": "customer",
  cert: "cert",
  certification: "cert",
  certificate: "cert",
};

/** Resolve a mill header as written → standard field (case-insensitive). */
export function resolveHeaderField(header: string): StandardField | undefined {
  const key = header.trim().toLowerCase();
  if (!key) return undefined;
  return BUILTIN_HEADER_TO_FIELD[key];
}
