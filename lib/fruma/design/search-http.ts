import { replayActiveCell, type ActiveMaterialQuality } from "../ingest/qualities-http";
import { qualitiesFromCells } from "../ingest/identity";
import type { SourceCell } from "../ingest/types";
import { requireTestFounder } from "../intelligence/http-auth";
import type { MaterialSearchHit } from "../persist";
import { getSpineStore } from "../persist";
import { MATERIAL_EMBEDDING_DIMENSIONS } from "../persist/embeddings";
import { surfaceFromRequest } from "../surfaces";
import type { FrumaVersion } from "../versions";

export const DESIGN_SEARCH_RESULT_LIMIT = 10;

export type RankedMaterialQuality = ActiveMaterialQuality & {
  rank: number;
  cosineDistance: number;
};

export type DesignSearchHttpResult =
  | { status: 200; surface: FrumaVersion; body: RankedMaterialQuality[] }
  | { status: 400; surface: FrumaVersion; body: { error: string } }
  | { status: 401; surface: FrumaVersion; body: { error: string } };

function readEmbedding(body: unknown): number[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const embedding = (body as { embedding?: unknown }).embedding;
  if (!Array.isArray(embedding) || embedding.length !== MATERIAL_EMBEDDING_DIMENSIONS) return null;
  const values: number[] = [];
  for (const value of embedding) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    values.push(value);
  }
  return values;
}

function pointerKey(depositId: string, cell: SourceCell): string {
  return `${depositId}\0${cell.pointer.sheet}\0${cell.pointer.row}\0${cell.pointer.column}`;
}

function toQuality(
  qualityRow: ReturnType<typeof qualitiesFromCells>["qualities"][number],
): ActiveMaterialQuality {
  return {
    id: qualityRow.id,
    supplierOrgId: qualityRow.supplierOrgId,
    millArticleCode: qualityRow.millArticleCode,
    depositId: qualityRow.depositId,
    visibility: qualityRow.visibility,
    colourways: qualityRow.colourways.map((colourway) => ({
      id: colourway.id,
      colourAsWritten: colourway.colourAsWritten,
    })),
    widths: qualityRow.widths.map((width) => ({ valueAsWritten: width.valueAsWritten })),
    cells: qualityRow.cells.map((cell) => ({
      sheet: cell.pointer.sheet,
      row: cell.pointer.row,
      column: cell.pointer.column,
      header: cell.header,
      sourceValue: cell.sourceValue,
      standardField: cell.standardField ?? null,
      standardValue: cell.standardValue ?? null,
      normalizedValue: cell.normalizedValue ?? null,
      confirmed: cell.confirmed === true,
    })),
  };
}

/**
 * Replay each hit, build qualities from the sheet row, and keep the closest cosine distance.
 * The frozen source text stays on the cell. Mapped standard values come from the event replay.
 */
export function rankDesignSearchHits(hits: readonly MaterialSearchHit[]): RankedMaterialQuality[] {
  const byDeposit = new Map<
    string,
    { supplierOrgId: string; cells: SourceCell[]; distanceByPointer: Map<string, number> }
  >();

  for (const hit of hits) {
    const active = replayActiveCell(hit);
    const key = pointerKey(hit.cell.depositId, active);
    const group = byDeposit.get(hit.cell.depositId) ?? {
      supplierOrgId: hit.supplierOrgId,
      cells: [],
      distanceByPointer: new Map<string, number>(),
    };
    group.cells.push(active);
    const previous = group.distanceByPointer.get(key);
    if (previous == null || hit.cosineDistance < previous) {
      group.distanceByPointer.set(key, hit.cosineDistance);
    }
    byDeposit.set(hit.cell.depositId, group);
  }

  const ranked: Omit<RankedMaterialQuality, "rank">[] = [];
  for (const [depositId, group] of byDeposit) {
    const built = qualitiesFromCells({
      supplierOrgId: group.supplierOrgId,
      depositId,
      cells: group.cells,
    });
    for (const qualityRow of built.qualities) {
      let distance = Number.POSITIVE_INFINITY;
      for (const cell of qualityRow.cells) {
        const cellDistance = group.distanceByPointer.get(pointerKey(depositId, cell));
        if (cellDistance != null && cellDistance < distance) distance = cellDistance;
      }
      if (!Number.isFinite(distance)) continue;
      ranked.push({ ...toQuality(qualityRow), cosineDistance: distance });
    }
  }

  ranked.sort(
    (a, b) => a.cosineDistance - b.cosineDistance || a.id.localeCompare(b.id) || a.depositId.localeCompare(b.depositId),
  );
  return ranked.slice(0, DESIGN_SEARCH_RESULT_LIMIT).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

function assertNoFileBytes(value: unknown): void {
  if (value instanceof Uint8Array) {
    throw new Error("Design search payload included file bytes.");
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoFileBytes(item);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "bytes") throw new Error("Design search payload included file bytes.");
    assertNoFileBytes(child);
  }
}

export async function handleDesignSearchRequest(request: Request): Promise<DesignSearchHttpResult> {
  const surface = surfaceFromRequest(request);
  const who = await requireTestFounder(request);
  if (!who) {
    return { status: 401, surface, body: { error: "Sign in to search materials." } };
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { status: 400, surface, body: { error: "Request body must be JSON." } };
  }
  const embedding = readEmbedding(payload);
  if (!embedding) {
    return {
      status: 400,
      surface,
      body: { error: "embedding must be an array of 1536 finite numbers." },
    };
  }

  // Acquiring the surface store runs SET search_path TO fruma_${version} on the pool.
  const store = getSpineStore(surface);
  const hits = await store.searchMaterialEmbeddings(embedding);
  const body = rankDesignSearchHits(hits);
  assertNoFileBytes(body);
  return { status: 200, surface, body };
}
