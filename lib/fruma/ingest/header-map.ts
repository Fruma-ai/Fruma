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

/** Alias kept for main intelligence callers. */
export const BUILTIN_HEADER_ALIASES = BUILTIN_HEADER_TO_FIELD;

export function headerKey(header: string): string {
  return header.trim().toLowerCase();
}

/**
 * Resolve a mill header as written → standard field (case-insensitive).
 * Mapping-agent confirmed overlays win over builtins for unknowns the mill taught us.
 */
export function resolveHeaderField(
  header: string,
  overlays?: Record<string, StandardField>,
): StandardField | undefined {
  const key = headerKey(header);
  if (!key) return undefined;
  return overlays?.[key] ?? BUILTIN_HEADER_TO_FIELD[key];
}
