import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  EMBEDDING_DIMENSIONS,
  PITCH_MATERIALS,
  assertPitchCompositions,
  chunk,
  compositionPercentageTotal,
  mockEmbedding,
} from "./seed-pitch-catalog";

describe("pitch catalog seed", () => {
  const source = readFileSync(new URL("./seed-pitch-catalog.ts", import.meta.url), "utf8");

  it("keeps every premium composition at exactly 100", () => {
    assertPitchCompositions(PITCH_MATERIALS);
    assert.equal(compositionPercentageTotal("100% Cashmere").total, 100);
    assert.equal(compositionPercentageTotal("98% Cotton / 2% Elastane").total, 100);
    for (const material of PITCH_MATERIALS) {
      assert.equal(compositionPercentageTotal(material.composition).total, 100);
    }
    assert.ok(PITCH_MATERIALS.some((material) => material.name === "Japanese Indigo Selvedge Denim"));
    assert.ok(PITCH_MATERIALS.some((material) => material.name === "Italian Recycled Cashmere Flannel"));
    assert.ok(PITCH_MATERIALS.some((material) => material.name === "Portuguese Organic Cotton Mesh"));
    assert.ok(PITCH_MATERIALS.some((material) => material.composition === "100% Cashmere"));
    assert.ok(PITCH_MATERIALS.some((material) => material.composition === "98% Cotton / 2% Elastane"));
  });

  it("builds 1536-dimensional deterministic embeddings and chunks the insert", () => {
    const vector = mockEmbedding("Japanese Indigo Selvedge Denim");
    assert.equal(vector.split(",").length, EMBEDDING_DIMENSIONS);
    assert.equal(vector.startsWith("["), true);
    assert.equal(vector.endsWith("]"), true);
    assert.equal(mockEmbedding("Japanese Indigo Selvedge Denim"), vector);
    assert.deepEqual(
      chunk(PITCH_MATERIALS, 4).map((page) => page.length),
      [4, 4, 4],
    );
  });

  it("writes the demo schema inside read-scoped transaction blocks", () => {
    assert.match(source, /sql\.begin\(/);
    assert.match(source, /SET LOCAL search_path TO fruma_demo, public/);
    assert.match(source, /fruma_source_cells/);
    assert.match(source, /fruma_material_embeddings/);
    assert.match(source, /fruma_factory_profiles/);
    assert.match(source, /2028-12-31/);
    assert.match(source, /public\.vector\(1536\)/);
    assert.match(source, /standard_field: "cert"/);
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP|TRUNCATE)\b/);
  });

  it("rejects a composition whose percentages miss 100", () => {
    assert.throws(
      () =>
        assertPitchCompositions([
          {
            ...PITCH_MATERIALS[0],
            composition: "80% Cotton / 30% Nylon",
          },
        ]),
      /COMPOSITION_INTEGRITY_MISMATCH/,
    );
  });
});
