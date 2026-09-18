import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  assessClaim,
  resetAgentRunsForTests,
  resetConfirmedHeadersForTests,
  runEvidenceAgent,
  runMappingAgent,
} from "./index";

describe("Evidence agent", () => {
  beforeEach(() => {
    resetAgentRunsForTests();
    resetConfirmedHeadersForTests();
  });

  it("never treats organic fibre wording as a certification", () => {
    const a = assessClaim({
      claimAsWritten: "70% ORGANIC COTTON / 30% COTTON",
      claimKind: "composition-fibre",
      sourceRecordId: "f:art:composition",
      factoryId: "factory-001",
      factoryName: "Test Mill",
      articleCode: "F001-Q100",
    });
    assert.equal(a.verdict, "fibre-not-cert");
    assert.equal(a.brandSafeToState, false);
    assert.ok(a.blockers.some((b) => /GOTS/i.test(b)));
  });

  it("marks GOTS hanger strings as org-scope-only without issuer", () => {
    const a = assessClaim({
      claimAsWritten: "GOTS",
      claimKind: "cert-string",
      sourceRecordId: "f:art:cert",
      factoryId: "factory-002",
      factoryName: "Test Mill",
      articleCode: "F002-Q100",
    });
    assert.equal(a.verdict, "org-scope-only");
    assert.equal(a.brandSafeToState, false);
    assert.equal(a.programme, "gots");
    assert.ok(a.blockers.some((b) => /Issuer/i.test(b)));
  });

  it("audits Northline shortlist and reports brand-value gaps", () => {
    runMappingAgent({ idempotencyKey: "ev-map" });
    const run = runEvidenceAgent({
      brandId: "brand-northline",
      refreshRetrieval: true,
      idempotencyKey: "ev-1",
    });
    assert.equal(run.kind, "evidence");
    assert.ok(run.output);
    assert.ok(run.output.assessments.length > 0);
    assert.equal(
      run.output.assessments.every((a) => a.brandSafeToState === false),
      true,
    );
    assert.ok(run.output.brandValue.headline.includes("honest"));
    assert.ok(
      run.output.summaryCounts.missing +
        run.output.summaryCounts["org-scope-only"] +
        run.output.summaryCounts["usable-with-confirm"] +
        run.output.summaryCounts["fibre-not-cert"] +
        run.output.summaryCounts.unscoped +
        run.output.summaryCounts["needs-issuer"] +
        run.output.summaryCounts["needs-validity"] ===
        run.output.assessments.length,
    );
  });
});
