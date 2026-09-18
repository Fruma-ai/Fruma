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

  it("harnesses all 50 factories via builtin dialect headers (no Mapping required)", () => {
    const run = runCorpusHarness({ idempotencyKey: "test-harness-1" });
    assert.ok(run.output);
    assert.equal(run.output.factoriesTotal, 50);
    assert.equal(run.output.factoriesOk, 50);
    assert.equal(run.output.factoriesFailed, 0);
    assert.equal(run.output.unmappedHeaderCount, 0);
    assert.equal(run.status, "succeeded");
    assert.ok(run.output.qualitiesTotal > 100);
  });

  it("mapping agent still confirms lexicon overlays and keeps harness green", () => {
    const before = runCorpusHarness({ idempotencyKey: "test-harness-before" });
    assert.equal(before.output!.factoriesOk, 50);

    // Unknown header only Mapping can teach — prove overlays still apply.
    confirmMappingProposal("Mystery Col", "colour");

    const mapping = runMappingAgent({
      autoConfirmHighConfidence: true,
      idempotencyKey: "test-mapping-1",
    });
    assert.ok(mapping.output);
    assert.ok(
      mapping.output.confirmed.some((c) => c.header === "mystery col" && c.field === "colour"),
    );

    resetAgentRunsForTests();
    const after = runCorpusHarness({ idempotencyKey: "test-harness-after" });
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
