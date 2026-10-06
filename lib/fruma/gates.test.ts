import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessApparelGates, type CaseSignals } from "./gates";

const empty: CaseSignals = {
  hasBrief: false,
  colour: "unset",
  clothCited: false,
  millAsked: false,
  millAnswered: false,
  clothAvailable: null,
  sourceLocked: false,
  compositionOnFile: false,
  constructionOnFile: false,
  weightOnFile: false,
  widthOnFile: false,
  claimGap: null,
};

function byId(signals: CaseSignals) {
  return Object.fromEntries(assessApparelGates(signals).map((gate) => [gate.id, gate]));
}

describe("apparel stage gates", () => {
  it("keeps nine gates in manufacturing order and never marks a physical gate ready", () => {
    const locked: CaseSignals = {
      ...empty,
      hasBrief: true,
      colour: "named",
      clothCited: true,
      millAsked: true,
      millAnswered: true,
      clothAvailable: true,
      sourceLocked: true,
      compositionOnFile: true,
      constructionOnFile: true,
      weightOnFile: true,
      widthOnFile: true,
    };
    const gates = assessApparelGates(locked);
    assert.deepEqual(
      gates.map((gate) => gate.id),
      ["concept", "materials", "pattern", "sample", "cutting", "assembly", "finishing", "inspection", "dispatch"],
    );
    for (const gate of gates) {
      if (gate.owns === "physical") assert.notEqual(gate.status, "ready");
    }
  });

  it("starts at the brief and does not invent a shade", () => {
    const waiting = byId(empty);
    assert.equal(waiting.concept.status, "waiting");
    assert.equal(waiting.materials.status, "waiting");
    assert.equal(waiting.cutting.status, "waiting");

    const open = byId({ ...empty, hasBrief: true, colour: "open" });
    assert.equal(open.concept.status, "ready");
    assert.match(open.concept.detail, /no shade is invented/i);
    assert.equal(open.materials.status, "waiting");
  });

  it("treats file commercials as a gap until the mill answers, then locks", () => {
    const cited = byId({ ...empty, hasBrief: true, colour: "named", clothCited: true });
    assert.equal(cited.materials.status, "gap");
    assert.match(cited.materials.detail, /historical/i);

    const asked = byId({ ...empty, hasBrief: true, colour: "named", clothCited: true, millAsked: true });
    assert.equal(asked.materials.status, "gap");

    const unavailable = byId({
      ...empty,
      hasBrief: true,
      colour: "named",
      clothCited: true,
      millAsked: true,
      millAnswered: true,
      clothAvailable: false,
    });
    assert.equal(unavailable.materials.status, "gap");
    assert.match(unavailable.materials.detail, /not available/i);
    assert.equal(unavailable.pattern.status, "waiting");
  });

  it("locks materials from data and leaves the floor physical", () => {
    const gates = byId({
      ...empty,
      hasBrief: true,
      colour: "named",
      clothCited: true,
      millAsked: true,
      millAnswered: true,
      clothAvailable: true,
      sourceLocked: true,
      compositionOnFile: true,
      constructionOnFile: true,
      weightOnFile: true,
      widthOnFile: false,
      claimGap: "Organic fibre is not a GOTS claim.",
    });
    assert.equal(gates.materials.status, "ready");
    assert.match(gates.materials.detail, /not a GOTS claim/);
    assert.equal(gates.pattern.status, "physical");
    assert.match(gates.cutting.detail, /Width is missing/);
    assert.match(gates.cutting.detail, /does not run the cutter/i);
    assert.equal(gates.assembly.status, "physical");
    assert.equal(gates.finishing.status, "ready");
    assert.match(gates.finishing.detail, /Care instructions stay blank/);
    assert.equal(gates.inspection.status, "physical");
    assert.match(gates.inspection.detail, /not a QC pass/i);
    assert.equal(gates.dispatch.status, "physical");
  });

  it("will not write a content label without composition", () => {
    const gates = byId({
      ...empty,
      hasBrief: true,
      colour: "named",
      clothCited: true,
      millAnswered: true,
      clothAvailable: true,
      sourceLocked: true,
      compositionOnFile: false,
    });
    assert.equal(gates.finishing.status, "gap");
    assert.match(gates.dispatch.detail, /Fibre is missing/);
  });
});
