import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  resetAgentRunsForTests,
  resetConfirmedHeadersForTests,
  runContinuityAgent,
  runCorpusHarness,
  runMappingAgent,
  runMultiBrandContinuity,
  runRetrievalAgent,
} from "./index";

describe("Continuity agent", () => {
  beforeEach(() => {
    resetAgentRunsForTests();
    resetConfirmedHeadersForTests();
  });

  it("establishes a baseline when no prior pair exists", () => {
    const run = runContinuityAgent({
      refresh: true,
      brandId: "brand-northline",
      idempotencyKey: "cont-1",
    });
    assert.equal(run.kind, "continuity");
    assert.equal(run.status, "succeeded");
    assert.ok(run.output);
    assert.equal(run.output.scope, "single");
    assert.equal(run.output.brandId, "brand-northline");
    assert.ok(
      run.output.brandValue.headline.includes("baseline") ||
        run.findings.some((f) => f.code === "baseline_established" || f.code === "no_exceptions"),
    );
  });

  it("emits harness recovery exceptions after Mapping improves pl-fleece", () => {
    runCorpusHarness({ idempotencyKey: "cont-h-before" });
    runMappingAgent({ idempotencyKey: "cont-map" });
    runCorpusHarness({ idempotencyKey: "cont-h-after" });
    runRetrievalAgent({ brandId: "brand-northline", idempotencyKey: "cont-r1" });
    runRetrievalAgent({ brandId: "brand-northline", idempotencyKey: "cont-r2" });

    const run = runContinuityAgent({
      refresh: false,
      brandId: "brand-northline",
      idempotencyKey: "cont-diff",
    });

    assert.ok(run.output?.baseline.established);
    assert.ok(
      run.output!.exceptions.some(
        (e) =>
          e.code === "factory_recovered" ||
          e.code === "dialect_ok_changed" ||
          e.code === "factory_ok_changed",
      ),
      `expected recovery exceptions, got ${run.output!.exceptions.map((e) => e.code).join(",")}`,
    );
    assert.ok(run.output!.brandValue.bullets.some((b) => b.includes("exceptions")));
  });

  it("reports clean rebuy when two identical retrievals are diffed", () => {
    runMappingAgent({ idempotencyKey: "cont-map2" });
    runCorpusHarness({ idempotencyKey: "cont-h-stable-a" });
    runCorpusHarness({ idempotencyKey: "cont-h-stable-b" });
    runRetrievalAgent({ brandId: "brand-northline", idempotencyKey: "cont-r-stable-a" });
    runRetrievalAgent({ brandId: "brand-northline", idempotencyKey: "cont-r-stable-b" });

    const run = runContinuityAgent({
      refresh: false,
      brandId: "brand-northline",
      idempotencyKey: "cont-clean",
    });

    assert.ok(run.output?.baseline.established);
    const retrievalExceptions = run.output!.exceptions.filter((e) => e.scope === "retrieval");
    assert.equal(retrievalExceptions.length, 0);
    assert.ok(run.output!.unchanged.retrievalShortlistStable >= 1);
  });

  it("scopes retrieval baselines per brand when switching Harbour after Northline", () => {
    runMappingAgent({ idempotencyKey: "cont-scope-map" });
    runCorpusHarness({ idempotencyKey: "cont-scope-h" });

    runRetrievalAgent({ brandId: "brand-northline", idempotencyKey: "cont-nl-a" });
    runRetrievalAgent({ brandId: "brand-northline", idempotencyKey: "cont-nl-b" });
    runRetrievalAgent({ brandId: "brand-harbour", idempotencyKey: "cont-hb-a" });
    runRetrievalAgent({ brandId: "brand-harbour", idempotencyKey: "cont-hb-b" });

    const harbour = runContinuityAgent({
      refresh: false,
      brandId: "brand-harbour",
      idempotencyKey: "cont-harbour-only",
    });

    assert.equal(harbour.output?.brandId, "brand-harbour");
    assert.ok(harbour.output?.baseline.established);
    // Must not invent a Northline→Harbour product_changed story
    assert.equal(
      harbour.output!.exceptions.filter((e) => e.code === "product_changed").length,
      0,
    );
    assert.equal(
      harbour.output!.exceptions.filter((e) => e.code === "brand_scope_guard").length,
      0,
    );
    const retrievalExceptions = harbour.output!.exceptions.filter((e) => e.scope === "retrieval");
    assert.equal(retrievalExceptions.length, 0);
    assert.ok(
      harbour.output!.exceptions.every(
        (e) => e.scope === "harness" || e.brandId === "brand-harbour" || !e.brandId,
      ),
    );
  });

  it("diffs all three brands without cross-tenant retrieval comparison", () => {
    runMappingAgent({ idempotencyKey: "cont-mb-map" });
    runCorpusHarness({ idempotencyKey: "cont-mb-h-a" });
    runCorpusHarness({ idempotencyKey: "cont-mb-h-b" });

    for (const brandId of ["brand-northline", "brand-harbour", "brand-fieldform"]) {
      runRetrievalAgent({ brandId, idempotencyKey: `cont-mb-${brandId}-a` });
      runRetrievalAgent({ brandId, idempotencyKey: `cont-mb-${brandId}-b` });
    }

    const run = runMultiBrandContinuity({
      refresh: false,
      idempotencyKey: "cont-mb-diff",
    });

    assert.equal(run.output?.scope, "all-test-brands");
    assert.ok(run.output?.baseline.established);
    assert.equal(run.output!.slices?.length, 3);
    assert.equal(run.output!.tenantIsolation?.leakDetected, false);
    assert.equal(run.output!.tenantIsolation?.crossBrandRetrievalDiffs, 0);
    for (const slice of run.output!.slices!) {
      assert.ok(slice.established, slice.brandName);
      assert.equal(slice.exceptionCount, 0, slice.brandName);
      assert.ok(slice.retrievalShortlistStable >= 1, slice.brandName);
    }
    assert.equal(
      run.output!.exceptions.filter((e) => e.code === "brand_scope_guard").length,
      0,
    );
    assert.equal(
      run.output!.exceptions.filter((e) => e.scope === "retrieval").length,
      0,
    );
  });

  it("allBrands flag routes to multi-brand Continuity", () => {
    const run = runContinuityAgent({
      refresh: true,
      allBrands: true,
      idempotencyKey: "cont-all-flag",
    });
    assert.equal(run.output?.scope, "all-test-brands");
    assert.equal(run.output?.slices?.length, 3);
  });
});
