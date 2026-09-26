import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { resetHeaderOverlaysForTests } from "../intelligence/overlays";
import { parseMillBytes } from "../ingest/parse";
import {
  PILOT_HEADERS,
  PILOT_WORKBOOK,
  pilotWorkbookBytes,
  resetPilotEngineForTests,
  runPilotSlice,
} from "./index";

describe("pilot vertical slice — workbook → map → cited shortlist", () => {
  beforeEach(() => {
    resetHeaderOverlaysForTests();
    resetPilotEngineForTests();
  });

  it("parses the pilot XLSX and keeps sheet/cell pointers", () => {
    const bytes = pilotWorkbookBytes();
    const { cells, format } = parseMillBytes(PILOT_WORKBOOK.filename, bytes);
    assert.equal(format, "xlsx");
    assert.ok(cells.length > 0);
    assert.ok(cells.every((c) => c.pointer.sheet === PILOT_WORKBOOK.sheetName));
    assert.ok(cells.some((c) => c.header === "Art." && c.sourceValue === "Q75-MESH"));
  });

  it("produces zero searchable qualities until headers are confirmed", () => {
    const skipped = runPilotSlice({ skipConfirm: true });
    assert.equal(skipped.workbook.qualitiesBeforeConfirm, 0);
    assert.ok(skipped.mapping.neededConfirm);
    assert.ok(skipped.mapping.proposals.some((p) => p.header === "Art." && p.proposedField === "article"));
  });

  it("after confirm: deposits searchable navy polo fabrics with cell citations", () => {
    const result = runPilotSlice();
    assert.equal(result.surface, "test");
    assert.ok(result.workbook.qualitiesAfterConfirm >= 4);
    assert.ok(result.shortlist.matchingFabricCount >= 2);
    assert.ok(result.shortlist.hits.every((h) => /navy/i.test(h.colourAsWritten)));
    assert.ok(result.shortlist.hits.every((h) => h.possibleEndProducts.includes("Polo")));
    assert.ok(result.shortlist.hits.every((h) => h.citations.length >= 3));
    assert.ok(
      result.shortlist.hits.some((h) =>
        h.citationLines.some((line) => line.includes("Colourway") && /Navy/i.test(line)),
      ),
    );

    const colour = result.shortlist.answerability.find((a) => a.requirementId === "req-colour");
    assert.ok(colour);
    assert.equal(colour.result, "on-file");
    assert.ok(colour.citations.some((c) => c.field === "colour" && /navy/i.test(c.sourceValue)));

    const moq = result.shortlist.answerability.find((a) => a.requirementId === "req-moq");
    assert.ok(moq);
    assert.equal(moq.result, "needs-confirm");
    assert.equal(result.shortlist.commercials.freshness, "historical");

    const organic = result.shortlist.evidence.find((e) => e.code === "organic-not-gots");
    assert.ok(organic);
    assert.equal(organic.severity, "block");

    for (const header of PILOT_HEADERS) {
      assert.ok(
        result.mapping.proposals.some((p) => p.header === header),
        `missing proposal for ${header}`,
      );
    }
  });

  it("never invents a GOTS claim from organic fibre wording", () => {
    const result = runPilotSlice();
    assert.ok(!result.shortlist.hits.some((h) => /GOTS/i.test(h.compositionAsWritten)));
    assert.ok(result.shortlist.evidence.every((e) => e.code !== "mill-programme-not-quality" || e.severity !== "block"));
  });
});
