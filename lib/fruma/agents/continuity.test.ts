import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  resetAgentRunsForTests,
  resetConfirmedHeadersForTests,
  runContinuityAgent,
  runCorpusHarness,
  runMappingAgent,
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
    // First refresh creates current runs; prior pair may be missing → baseline message
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
        (e) => e.code === "factory_recovered" || e.code === "dialect_ok_changed" || e.code === "factory_ok_changed",
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
      idempotencyKey: "cont-clean",
    });

    assert.ok(run.output?.baseline.established);
    const retrievalExceptions = run.output!.exceptions.filter((e) => e.scope === "retrieval");
    assert.equal(retrievalExceptions.length, 0);
    assert.ok(run.output!.unchanged.retrievalShortlistStable >= 1);
  });
});
