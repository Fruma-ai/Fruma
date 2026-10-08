import { requireTestFounder } from "../intelligence/http-auth";
import { vectorLiteral } from "../persist/embeddings";
import { searchPathStatement } from "../persist/postgres-schema";
import { getPostgresPool, type PinnedLedgerClient } from "../persist/postgres-store";
import { isFrumaVersion, type FrumaVersion } from "../versions";
import type { ComplianceTarget } from "./compliance";
import { simulatedVisualEmbedding } from "./visual-embedding";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/quicktime",
]);

/** One studio upload. Larger files never reach the embedding step. */
export const VISUAL_PAYLOAD_MAX_BYTES = 32 * 1024 * 1024;

const ARTICLE_HEADERS = new Set(["art.", "art", "article", "article code", "art. no", "art no"]);

const VISUAL_SEARCH_SQL = `
  SELECT
    emb.source_cell_id,
    c.raw_header,
    c.source_value,
    c.normalized_value,
    (emb.embedding OPERATOR(public.<=>) $1::public.vector) AS cosine_distance
  FROM fruma_material_embeddings emb
  INNER JOIN fruma_source_cells c ON c.id = emb.source_cell_id
  ORDER BY emb.embedding OPERATOR(public.<=>) $1::public.vector ASC
  LIMIT 10
`;

export type VisualSearchMatch = {
  rank: number;
  cellId: string;
  articleCode: string;
  sourceText: string;
  normalizedValue: string | null;
  cosineDistance: number;
};

export type VisualSearchBody = {
  success: true;
  mediaType: string;
  complianceTarget: ComplianceTarget | null;
  results: VisualSearchMatch[];
};

export type VisualSearchHttpResult =
  | { status: 200; surface: FrumaVersion; body: VisualSearchBody }
  | {
      status: 400;
      surface: FrumaVersion | null;
      body: {
        error:
          | "invalid_environment_surface"
          | "invalid_visual_payload"
          | "missing_mandatory_visual_payload"
          | "visual_payload_too_large"
          | "unsupported_media_format"
          | "invalid_compliance_target";
      };
    }
  | { status: 401; surface: FrumaVersion | null; body: { error: "unauthorized_operator" } }
  | { status: 500; surface: FrumaVersion; body: { error: "internal_ledger_execution_failure" } };

function versionFromHeader(request: Request): FrumaVersion | "invalid" {
  const raw = request.headers.get("x-fruma-version");
  if (!raw) return "demo";
  return isFrumaVersion(raw) ? raw : "invalid";
}

function readFormCompliance(value: FormDataEntryValue | null): ComplianceTarget | null | "invalid" {
  if (value == null) return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "null") return null;
  if (trimmed === "EU_DPP" || trimmed === "UK_STANDARDS") return trimmed;
  return "invalid";
}

function articleCodeFor(rawHeader: unknown, sourceValue: unknown): string {
  const header = typeof rawHeader === "string" ? rawHeader.trim().toLowerCase() : "";
  if (!ARTICLE_HEADERS.has(header) || typeof sourceValue !== "string") return "UNMAPPED_ARTICLE";
  return sourceValue;
}

function readDistance(value: unknown): number {
  const distance = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(distance)) {
    throw new Error("Visual search row is missing a cosine distance.");
  }
  return distance;
}

function assertNoFileBytes(value: unknown): void {
  if (value instanceof Uint8Array) {
    throw new Error("Visual search payload included file bytes.");
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoFileBytes(item);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "bytes") throw new Error("Visual search payload included file bytes.");
    assertNoFileBytes(child);
  }
}

/**
 * Founder session required. The pool is the schema for x-fruma-version.
 * The upload is hashed into a 1536-d vector and ranked with public.<=>.
 */
export async function handleVisualSearchRequest(request: Request): Promise<VisualSearchHttpResult> {
  const version = versionFromHeader(request);
  const who = await requireTestFounder(request);
  if (!who) {
    return {
      status: 401,
      surface: version === "invalid" ? null : version,
      body: { error: "unauthorized_operator" },
    };
  }
  if (version === "invalid") {
    return { status: 400, surface: null, body: { error: "invalid_environment_surface" } };
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { status: 400, surface: version, body: { error: "invalid_visual_payload" } };
  }

  const mediaFile = form.get("mediaFile");
  if (!(mediaFile instanceof File) || mediaFile.size === 0) {
    return { status: 400, surface: version, body: { error: "missing_mandatory_visual_payload" } };
  }
  if (mediaFile.size > VISUAL_PAYLOAD_MAX_BYTES) {
    return { status: 400, surface: version, body: { error: "visual_payload_too_large" } };
  }
  if (!ALLOWED_MIME_TYPES.has(mediaFile.type)) {
    return { status: 400, surface: version, body: { error: "unsupported_media_format" } };
  }
  const complianceTarget = readFormCompliance(form.get("complianceTarget"));
  if (complianceTarget === "invalid") {
    return { status: 400, surface: version, body: { error: "invalid_compliance_target" } };
  }

  let client: PinnedLedgerClient | undefined;
  try {
    const vector = simulatedVisualEmbedding(new Uint8Array(await mediaFile.arrayBuffer()));
    const pool = getPostgresPool(version);
    client = await pool.connect();
    await client.unsafe(searchPathStatement(version));
    const rows = await client.unsafe(VISUAL_SEARCH_SQL, [vectorLiteral(vector)]);
    const results = rows.map((row, index) => ({
      rank: index + 1,
      cellId: String(row.source_cell_id),
      articleCode: articleCodeFor(row.raw_header, row.source_value),
      sourceText: String(row.source_value),
      normalizedValue: row.normalized_value == null ? null : String(row.normalized_value),
      cosineDistance: readDistance(row.cosine_distance),
    }));
    const body: VisualSearchBody = {
      success: true,
      mediaType: mediaFile.type,
      complianceTarget,
      results,
    };
    assertNoFileBytes(body);
    return { status: 200, surface: version, body };
  } catch {
    return { status: 500, surface: version, body: { error: "internal_ledger_execution_failure" } };
  } finally {
    client?.release();
  }
}
