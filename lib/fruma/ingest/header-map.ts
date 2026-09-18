import type { StandardField } from "./types";

/**
 * Builtin mill-header aliases. Mapping overlays sit on top and never
 * replace the mill's sourceValue — they only attach a standardField.
 */
export const BUILTIN_HEADER_ALIASES: Record<string, StandardField> = {
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

export function headerKey(header: string): string {
  return header.trim().toLowerCase();
}

/** Confirmed overlays win; otherwise builtin aliases. Unknown stays undefined. */
export function resolveHeaderField(
  header: string,
  overlays?: Record<string, StandardField>,
): StandardField | undefined {
  const key = headerKey(header);
  if (!key) return undefined;
  return overlays?.[key] ?? BUILTIN_HEADER_ALIASES[key];
}
