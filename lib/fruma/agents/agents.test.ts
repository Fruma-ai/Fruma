import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  confirmMappingProposal,
  resetConfirmedHeadersForTests,
  resetAgentRunsForTests,
  runCorpusHarness,
  runMappingAgent,
} from "./index";

describe("Corpus Harness + Mapping agents", () => {
  beforeEach(() => {
    resetAgentRunsForTests();
    resetConfirmedHeadersForTests();
  });

  it("harnesses all 50 factories and flags dialects with unmapped article headers", () => {
    const run = runCorpusHarness({ idempotencyKey: "test-harness-1" });
    assert.ok(run.output);
    assert.equal(run.output.factoriesTotal, 50);
    assert.ok(run.output.factoriesOk < 50, "some dialects should fail before mapping");
    assert.ok(run.output.unmappedHeaderCount > 0);
    assert.ok(run.findings.some((f) => f.code === "dialect_total_failure" || f.code === "zero_qualities"));
    assert.equal(run.status, "needs-review");
  });

  it("mapping agent auto-confirms high-confidence lexicon headers and improves harness", () => {
    const before = runCorpusHarness({ idempotencyKey: "test-harness-before" });
    const failedBefore = before.output!.factoriesFailed;

    const mapping = runMappingAgent({
      autoConfirmHighConfidence: true,
      idempotencyKey: "test-mapping-1",
    });
    assert.ok(mapping.output);
    assert.ok(mapping.output.confirmed.length > 0, "should confirm Weave, Art., etc.");
    assert.ok(
      mapping.output.confirmed.some((c) => c.header === "art." && c.field === "article"),
    );

    resetAgentRunsForTests();
    const after = runCorpusHarness({ idempotencyKey: "test-harness-after" });
    assert.ok(after.output!.factoriesFailed < failedBefore, "mapping should recover factories");
    assert.equal(after.output!.factoriesOk, 50);
    assert.equal(after.status, "succeeded");
  });

  it("manual confirm adds overlays", () => {
    confirmMappingProposal("Mystery Col", "colour");
    const mapping = runMappingAgent({
      autoConfirmHighConfidence: false,
      idempotencyKey: "test-mapping-manual",
    });
    assert.ok(mapping.output!.confirmed.some((c) => c.header === "mystery col"));
  });
});
