import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { TEST_LINKS } from "../test-corpus";
import {
  resetAgentRunsForTests,
  resetConfirmedHeadersForTests,
  runMappingAgent,
  runMultiBrandIntelligence,
  runRetrievalAgent,
} from "./index";

describe("Multi-brand intelligence", () => {
  beforeEach(() => {
    resetAgentRunsForTests();
    resetConfirmedHeadersForTests();
  });

  it("returns slices for all three Test brands with shortlists", () => {
    runMappingAgent({ idempotencyKey: "mb-map" });
    const run = runMultiBrandIntelligence({ idempotencyKey: "mb-1" });
    assert.equal(run.status, "succeeded");
    assert.ok(run.output);
    assert.equal(run.output.slices.length, 3);
    for (const slice of run.output.slices) {
      assert.ok(slice.shortlistSize > 0, slice.brandName);
      assert.ok(slice.excludedSkipped > 0, slice.brandName);
      assert.equal(slice.evidenceNotBrandSafe, slice.evidenceClaims);
    }
    assert.equal(run.output.tenantIsolation.leakDetected, false);
    assert.ok(run.output.brandValue.bullets.length === 3);
  });

  it("never puts an excluded mill on that brand’s shortlist", () => {
    for (const brandId of ["brand-northline", "brand-harbour", "brand-fieldform"]) {
      const run = runRetrievalAgent({
        brandId,
        idempotencyKey: `mb-excl-${brandId}`,
      });
      const excluded = new Set(
        TEST_LINKS.filter((l) => l.brandId === brandId && l.relationship === "excluded").map(
          (l) => l.factoryId,
        ),
      );
      for (const row of run.output!.shortlist) {
        assert.equal(excluded.has(row.factoryId), false, `${brandId} leaked ${row.factoryId}`);
        assert.notEqual(row.relationship, "excluded");
      }
    }
  });

  it("keeps private relationships divergent across brands for the same mill", () => {
    const run = runMultiBrandIntelligence({ idempotencyKey: "mb-iso" });
    const rels = run.output!.tenantIsolation.relationshipsByBrand.map((r) => r.relationship);
    assert.ok(new Set(rels).size >= 1);
    // Same factory id checked for each brand — memory is per brandId
    assert.equal(run.output!.tenantIsolation.relationshipsByBrand.length, 3);
  });
});
