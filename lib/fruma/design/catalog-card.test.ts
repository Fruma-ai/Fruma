import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasEuDppPass, swatchHex, uniformMaterialFromHit, type CatalogSearchHit } from "./catalog-card";

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
    assert.equal(swatchHex("unknown glaze"), swatchHex("unknown glaze"));
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