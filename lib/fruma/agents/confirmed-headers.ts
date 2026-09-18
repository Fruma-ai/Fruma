import type { StandardField } from "../ingest/types";
import { TEST_SURFACE } from "../surfaces";
import type { FrumaVersion } from "../versions";

/**
 * Confirmed mill-header → Fruma field maps.
 * In-memory for now (lost on process restart). Promote to Postgres when
 * confirmations must survive deploys / multi-instance.
 */
const overlaysBySurface = new Map<FrumaVersion, Map<string, StandardField>>();

function mapFor(surface: FrumaVersion): Map<string, StandardField> {
  let m = overlaysBySurface.get(surface);
  if (!m) {
    m = new Map();
    overlaysBySurface.set(surface, m);
  }
  return m;
}

export function confirmedHeaderOverlays(
  surface: FrumaVersion = TEST_SURFACE,
): Record<string, StandardField> {
  return Object.fromEntries(mapFor(surface));
}

export function confirmHeaderMapping(
  header: string,
  field: StandardField,
  surface: FrumaVersion = TEST_SURFACE,
): void {
  const key = header.trim().toLowerCase();
  if (!key) return;
  mapFor(surface).set(key, field);
}

export function listConfirmedHeaderMappings(
  surface: FrumaVersion = TEST_SURFACE,
): { header: string; field: StandardField }[] {
  return [...mapFor(surface).entries()].map(([header, field]) => ({ header, field }));
}

export function resetConfirmedHeadersForTests() {
  overlaysBySurface.clear();
}
