import type { StandardField } from "./types";

/** Built-in header → Fruma standard field. Mapping agent proposes overlays for unknowns. */
export const BUILTIN_HEADER_TO_FIELD: Record<string, StandardField> = {
  article: "article",
  "article code": "article",
  "fabric no": "article",
  "mill article code": "article",
  construction: "construction",
  composition: "composition",
  weight: "weight",
  width: "width",
  colour: "colour",
  color: "colour",
  colours: "colour",
  colors: "colour",
  moq: "moq",
  customer: "customer",
  cert: "cert",
  certification: "cert",
};

export function resolveHeaderField(
  header: string,
  overlays?: Record<string, StandardField>,
): StandardField | undefined {
  const key = header.trim().toLowerCase();
  if (!key) return undefined;
  return overlays?.[key] ?? BUILTIN_HEADER_TO_FIELD[key];
}
