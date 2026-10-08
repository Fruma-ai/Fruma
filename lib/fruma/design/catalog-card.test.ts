import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasEuDppPass,
  priorDevelopmentsFor,
  swatchHex,
  uniformMaterialFromHit,
  type CatalogSearchHit,
} from "./catalog-card";

const HIT: CatalogSearchHit = {
  id: "bq:org_mill:HX-100",
  millArticleCode: "HX-100",
  cosineDistance: 0.2,
  score: 0.8,
  cells: [
    { standardField: "weight", normalizedValue: "278.027125", sourceValue: "8.2 oz" },
    { standardField: "width", standardValue: "106.68", sourceValue: "42 in" },
    { standardField: "composition", sourceValue: "100% cotton" },
    { standardField: "construction", normalizedValue: "twill" },
  ],
  colourways: [
    { id: "cw:navy", colourAsWritten: "Navy" },
    { id: "cw:ecru", colourAsWritten: "Ecru" },
    { colourAsWritten: "  " },
  ],
};

describe("uniform material cards", () => {
  it("reads normalized physical fields and named swatches from a search hit", () => {
    const card = uniformMaterialFromHit(HIT);
    assert.equal(card.articleCode, "HX-100");
    assert.equal(card.normalizedGsm, "278.027125");
    assert.equal(card.normalizedWidth, "106.68");
    assert.equal(card.composition, "100% cotton");
    assert.equal(card.construction, "twill");
    assert.deepEqual(card.colorways, [
      { name: "Navy", dyeLot: "cw:navy", hex: "#1B2A4A" },
      { name: "Ecru", dyeLot: "cw:ecru", hex: "#F2E8D5" },
    ]);
    assert.equal(card.hasDppProof, false);
    assert.equal(card.historicalProductMatch, undefined);
    assert.deepEqual(
      priorDevelopmentsFor([
        { articleCode: " JK-2026 ", lastOrderedAt: " 2026-01-15T00:00:00.000Z " },
        { articleCode: "JK-2026", lastOrderedAt: "2024-03-01T00:00:00.000Z" },
        { articleCode: "  ", lastOrderedAt: "2020-01-01T00:00:00.000Z" },
        { articleCode: "JK-2024", lastOrderedAt: "2024-03-01T00:00:00.000Z" },
      ]),
      [
        { article_code: "JK-2026", last_ordered_at: "2026-01-15T00:00:00.000Z" },
        { article_code: "JK-2024", last_ordered_at: "2024-03-01T00:00:00.000Z" },
      ],
    );
    assert.deepEqual(priorDevelopmentsFor(undefined), []);
    assert.equal(swatchHex("unknown glaze"), swatchHex("unknown glaze"));
  });

  it("copies a complete in-house swatch and drops an incomplete one", () => {
    const card = uniformMaterialFromHit({
      ...HIT,
      historicalProductMatch: {
        productName: " Harbor Coat ",
        seasonCode: "AW26",
        warehouseLocation: "A-12",
      },
    });
    assert.deepEqual(card.historicalProductMatch, {
      productName: "Harbor Coat",
      seasonCode: "AW26",
      warehouseLocation: "A-12",
    });
    assert.equal(
      uniformMaterialFromHit({
        ...HIT,
        historicalProductMatch: { productName: "Coat", seasonCode: "", warehouseLocation: "A-12" },
      }).historicalProductMatch,
      undefined,
    );
  });

  it("marks EU DPP pass only when the rerank boost is present and the warning is absent", () => {
    assert.equal(hasEuDppPass({ cosineDistance: 0.2, score: 1 }), true);
    assert.equal(hasEuDppPass({ cosineDistance: 0.2, score: 0.8 }), false);
    assert.equal(
      hasEuDppPass({ cosineDistance: 0.2, score: 1, compliance_warning: { message: "missing" } }),
      false,
    );
    assert.equal(uniformMaterialFromHit({ ...HIT, millArticleCode: "  ", score: 1 }).articleCode, "UNMAPPED_ARTICLE");
    assert.equal(uniformMaterialFromHit({ ...HIT, cells: [], colourways: [] }).normalizedGsm, "—");
    assert.equal(
      uniformMaterialFromHit({ ...HIT, compliance_warning: { message: "  No current evidence.  " } }).complianceWarning,
      "No current evidence.",
    );
  });
});