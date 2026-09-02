import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FILE_RECEIVED_COPY } from "./honesty";
import {
  millColumnsFromAsSent,
  millFieldsFromAsSent,
  MILL_COLUMNS,
} from "./mill-ingest";

describe("SPEC 9 mill-ingest Map column samples", () => {
  it("overlays as-sent article samples and does not keep seeded VDA cells", () => {
    const columns = millColumnsFromAsSent({
      articleSamples: "SYN-QA-100 · SYN-QA-200",
      colourwaySamples: "1 colourway",
    });
    const fabricNo = columns.find((c) => c.id === "Fabric No");
    const colours = columns.find((c) => c.id === "Colours");
    const construction = columns.find((c) => c.id === "Construction");
    assert.equal(fabricNo?.samples, "SYN-QA-100 · SYN-QA-200");
    assert.equal(colours?.samples, "1 colourway");
    assert.equal(construction?.samples, "—");
    assert.equal(columns.some((c) => c.samples.includes("VDA-2401")), false);
    assert.equal(columns.some((c) => c.samples.includes("DPWR192924")), false);
    assert.ok(MILL_COLUMNS.some((c) => c.samples.includes("VDA-2401")));
  });

  it("Fruma field previews after drop are as-sent, not seeded mill values", () => {
    const fields = millFieldsFromAsSent({
      articlePreview: "SYN-QA-100",
      colourPreview: "1 colourway",
    });
    const article = fields.find((f) => f.key === "article");
    const structure = fields.find((f) => f.key === "structure");
    assert.equal(article?.preview, "SYN-QA-100");
    assert.equal(structure?.preview, "—");
    assert.equal(fields.some((f) => f.preview.includes("DPWR192924")), false);
    assert.equal(fields.some((f) => /waffle/i.test(f.preview)), false);
    assert.equal(FILE_RECEIVED_COPY, "File received. Not mapped. Not in the live catalogue.");
  });
});
