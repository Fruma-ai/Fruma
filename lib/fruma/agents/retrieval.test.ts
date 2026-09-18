import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { DEFAULT_AGENT_LIMITS } from "../agent-runtime";
import {
  resetAgentRunsForTests,
  resetConfirmedHeadersForTests,
  runRetrievalAgent,
} from "./index";

describe("Retrieval agent", () => {
  beforeEach(() => {
    resetAgentRunsForTests();
    resetConfirmedHeadersForTests();
  });

  it("returns a bounded Northline shortlist with evidence and skips exclusions", () => {
    const run = runRetrievalAgent({
      brandId: "brand-northline",
      idempotencyKey: "test-retrieval-1",
    });
    assert.equal(run.kind, "retrieval");
    assert.equal(run.status, "succeeded");
    assert.ok(run.output);
    assert.ok(run.output.shortlist.length > 0);
    assert.ok(run.output.shortlist.length <= DEFAULT_AGENT_LIMITS.deepMatchCandidates);
    assert.ok(run.output.candidatesConsidered <= DEFAULT_AGENT_LIMITS.retrievalCandidates);
    assert.ok(run.sourcePointers.length <= DEFAULT_AGENT_LIMITS.sourcePointersPerRun);
    assert.ok(run.output.excludedFactoriesSkipped > 0);
    assert.equal(run.output.brief.brandId, "brand-northline");
    assert.ok(run.output.brief.requirements.some((r) => r.kind === "MUST"));

    for (const row of run.output.shortlist) {
      assert.notEqual(row.relationship, "excluded");
      assert.ok(row.evidence.length >= 1);
      assert.ok(row.articleCode);
    }

    assert.ok(run.output.brandValue.headline.includes("Northline"));
    assert.ok(run.findings.some((f) => f.code === "brand_value_shortlist"));
  });

  it("boosts preferred/proven into the shortlist when eligible", () => {
    const run = runRetrievalAgent({
      brandId: "brand-northline",
      idempotencyKey: "test-retrieval-2",
    });
    const boosted = run.output!.shortlist.filter(
      (s) => s.relationship === "preferred" || s.relationship === "proven",
    );
    assert.ok(boosted.length >= 1, "expected relationship boost on shortlist");
  });
});
