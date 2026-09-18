import type { StandardField } from "../ingest/types";
import { TEST_SURFACE } from "../surfaces";
import type { FrumaVersion } from "../versions";
import { PROPOSAL_LEXICON } from "./mapping-lexicon";

const STANDARD_FIELDS = new Set<StandardField>([
  "article",
  "construction",
  "composition",
  "weight",
  "width",
  "colour",
  "moq",
  "customer",
  "cert",
]);

const overlaysBySurface = new Map<FrumaVersion, Record<string, StandardField>>();

export function confirmedHeaderOverlays(
  surface: FrumaVersion = TEST_SURFACE,
): Record<string, StandardField> {
  return { ...(overlaysBySurface.get(surface) ?? {}) };
}

export function confirmHeaders(
  headers: Record<string, string>,
  surface: FrumaVersion = TEST_SURFACE,
): Record<string, StandardField> {
  const next = confirmedHeaderOverlays(surface);
  for (const [rawHeader, rawField] of Object.entries(headers)) {
    const header = rawHeader.trim().toLowerCase();
    const field = rawField.trim() as StandardField;
    if (!header) continue;
    if (!STANDARD_FIELDS.has(field)) {
      throw new Error(`unknown_standard_field:${rawField}`);
    }
    next[header] = field;
  }
  overlaysBySurface.set(surface, next);
  return { ...next };
}

/** Confirm every lexicon match for the given mill headers. Unknown headers stay unknown. */
export function confirmLexiconForHeaders(
  headers: string[],
  surface: FrumaVersion = TEST_SURFACE,
): Record<string, StandardField> {
  const batch: Record<string, string> = {};
  for (const header of headers) {
    const key = header.trim().toLowerCase();
    const field = PROPOSAL_LEXICON[key];
    if (field) batch[header] = field;
  }
  return confirmHeaders(batch, surface);
}

export function resetHeaderOverlaysForTests() {
  overlaysBySurface.clear();
}
