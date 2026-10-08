import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MATERIAL_EMBEDDING_DIMENSIONS, briefEmbedding, vectorLiteral } from "../lib/fruma/persist/embeddings";
import {
  COTTON_MESH_BRIEF,
  LATENCY_BASELINE_MS,
  SEARCH_RUNS,
  benchmarkSearchPathSql,
  formatBenchmark,
  materialSearchSql,
  percentile,
  summarizeLatencies,
} from "./benchmark-search";

describe("material search benchmark", () => {
  it("uses the materialized 50-row HNSW scan for the cotton mesh brief", async () => {
    assert.equal(COTTON_MESH_BRIEF, "100% Cotton Mesh");
    assert.equal(SEARCH_RUNS, 100);
    assert.equal(LATENCY_BASELINE_MS, 50);
    assert.equal(benchmarkSearchPathSql(), "SET LOCAL search_path TO fruma_demo");
    const embedding = await briefEmbedding(COTTON_MESH_BRIEF);
    const literal = vectorLiteral(embedding);
    assert.equal(embedding.length, MATERIAL_EMBEDDING_DIMENSIONS);
    assert.equal(literal.slice(1, -1).split(",").length, MATERIAL_EMBEDDING_DIMENSIONS);
    const sql = materialSearchSql();
    assert.match(sql, /WITH nearest AS MATERIALIZED \(/);
    assert.match(sql, /ORDER BY emb\.embedding OPERATOR\(public\.<=>\) \$1::public\.vector ASC\s+LIMIT 50/);
    assert.match(sql, /"fruma_demo"\."fruma_material_embeddings"/);
    assert.equal(sql.includes("$vector"), false);
    assert.equal((sql.match(/\$1/g) ?? []).length, 2);
    assert.equal(/MIN\s*\(/.test(sql), false);
    assert.equal(/GROUP BY/.test(sql), false);
    assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE|DROP|TRUNCATE)\b/);
    const limitAt = sql.indexOf("LIMIT 50");
    assert.equal(limitAt < sql.indexOf("fruma_source_cells"), true);
    const source = readFileSync(new URL("./benchmark-search.ts", import.meta.url), "utf8");
    assert.match(source, /briefEmbedding\(COTTON_MESH_BRIEF\)/);
    assert.match(source, /sql\.begin\("READ ONLY"/);
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE)\b/);
  });

  it("reports average, p95, and p99 with nearest-rank percentiles", () => {
    const samples = Array.from({ length: 100 }, (_, index) => index + 1);
    const summary = summarizeLatencies(samples);
    assert.equal(summary.runs, 100);
    assert.equal(summary.averageMs, 50.5);
    assert.equal(summary.p95Ms, 95);
    assert.equal(summary.p99Ms, 99);
    assert.equal(summary.minMs, 1);
    assert.equal(summary.maxMs, 100);
    assert.equal(percentile([4, 1, 3, 2], 50), 2);
    const lines = formatBenchmark({
      brief: COTTON_MESH_BRIEF,
      dimensions: 1536,
      rows: 50,
      plan: ["Index Scan using material_embedding_hnsw_idx"],
      ...summary,
    });
    assert.equal(lines.some((line) => line.includes("average 50.50 ms")), true);
    assert.equal(lines.some((line) => line.includes("p95 95.00 ms")), true);
    assert.equal(lines.some((line) => line.includes("p99 99.00 ms")), true);
    assert.equal(lines.some((line) => line.includes("p95 is above the 50 ms baseline")), true);
    assert.equal(lines.some((line) => line.includes("average is above the 50 ms baseline")), true);
  });
});
