import type { PersistedMaterialEmbedding } from "./types";

/** OpenAI-sized sketch and brief vectors stored in fruma_material_embeddings. */
export const MATERIAL_EMBEDDING_DIMENSIONS = 1536;

/** Nearest embedding rows expanded into sheet rows before qualities are ranked. */
export const MATERIAL_SEARCH_CANDIDATE_LIMIT = 50;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertMaterialEmbedding(row: PersistedMaterialEmbedding): void {
  if (!UUID_RE.test(row.id)) throw new Error("Material embedding id must be a UUID.");
  if (!row.sourceCellId.trim()) throw new Error("Material embedding requires a source cell.");
  if (!row.updatedAt.trim()) throw new Error("Material embedding requires updated_at.");
  assertEmbeddingVector(row.embedding);
}

export function assertEmbeddingVector(values: readonly number[]): void {
  if (
    values.length !== MATERIAL_EMBEDDING_DIMENSIONS ||
    values.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error(
      `Material embedding must be ${MATERIAL_EMBEDDING_DIMENSIONS} finite numbers.`,
    );
  }
}

/** pgvector text input. Callers pass finite numbers only. */
export function vectorLiteral(values: readonly number[]): string {
  assertEmbeddingVector(values);
  return `[${values.join(",")}]`;
}

/**
 * pgvector `<=>` on cosine ops: 1 − cosine similarity.
 * A zero vector has no direction, so the distance is the maximum similarity gap of 1.
 */
/**
 * Deterministic 1536-d brief vector. The same text always maps to the same point,
 * using the same byte scaling as the visual stand-in.
 */
export async function briefEmbedding(text: string): Promise<number[]> {
  const values: number[] = [];
  let block = 0;
  const encoded = new TextEncoder();
  const source = text.trim();
  while (values.length < MATERIAL_EMBEDDING_DIMENSIONS) {
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoded.encode(`${source}\0${block}`)),
    );
    for (const byte of digest) {
      if (values.length === MATERIAL_EMBEDDING_DIMENSIONS) break;
      values.push(byte / 127.5 - 1);
    }
    block += 1;
  }
  return values;
}

export function cosineDistance(left: readonly number[], right: readonly number[]): number {
  const width = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < width; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 1;
  const similarity = dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
  const clamped = Math.min(1, Math.max(-1, similarity));
  return 1 - clamped;
}
