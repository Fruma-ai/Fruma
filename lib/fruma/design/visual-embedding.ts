import { createHash } from "node:crypto";

import { MATERIAL_EMBEDDING_DIMENSIONS } from "../persist/embeddings";

/**
 * Stand-in for a CLIP embedding.
 * Live video would average three keyframes into one 1536-d vector.
 * This hashes the file bytes so the same payload always maps to the same vector.
 */
export function simulatedVisualEmbedding(bytes: Uint8Array): number[] {
  const values: number[] = [];
  let block = 0;
  while (values.length < MATERIAL_EMBEDDING_DIMENSIONS) {
    const digest = createHash("sha256")
      .update(bytes)
      .update(String(block))
      .digest();
    for (const byte of digest) {
      if (values.length === MATERIAL_EMBEDDING_DIMENSIONS) break;
      values.push(byte / 127.5 - 1);
    }
    block += 1;
  }
  return values;
}
