import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SourceCell } from "../ingest/types";
import { proposeFieldForHeader } from "../intelligence/mapping-lexicon";
import { standardGapsFromCells, suggestStandardValue } from "./standard-gaps";

function cell(partial: Partial<SourceCell> & Pick<SourceCell, "header" | "sourceValue" | "column">): SourceCell {
  return {
    pointer: { sheet: "Qualities", row: 2, column: partial.column },
    sourceValue: partial.sourceValue,
    header: partial.header,
    ...(partial.standardField ? { standardField: partial.standardField } : {}),
    ...(partial.standardValue ? { standardValue: partial.standardValue } : {}),
    ...(partial.confirmed ? { confirmed: true } : {}),
  };
}

const resolve = (item: SourceCell) =>
  item.standardField ?? proposeFieldForHeader(item.header).proposedField ?? undefined;

describe("standard value suggestions", () => {
  it("writes a GSM number as g/m² and converts ounces", () => {
    assert.equal(suggestStandardValue("weight", "160", "GSM").value, "160 g/m²");
    assert.equal(suggestStandardValue("weight", "8.2 OZ", "Weight").value, "278 g/m²");
    assert.equal(suggestStandardValue("weight", "160", "Weight").value, null);
  });

  it("writes centimetres and converts inches", () => {
    assert.equal(suggestStandardValue("width", "150", "Width cm").value, "150 cm");
    assert.equal(suggestStandardValue("width", '42"', "W").value, "107 cm");
    assert.equal(suggestStandardValue("width", "42", "W").value, null);
  });

  it("keeps mill fibre text and does not invent GOTS", () => {
    const organic = suggestStandardValue(
      "composition",
      "70% ORGANIC COTTON / 30% COTTON",
      "Fibre",
    );
    assert.equal(organic.value, "70% organic cotton / 30% cotton");
    assert.equal(organic.value?.includes("GOTS"), false);
    assert.equal(suggestStandardValue("composition", "100% CO", "Fibre").value, "100% cotton");
    assert.equal(suggestStandardValue("construction", "WARP MESH", "Knit type").value, "mesh");
    assert.equal(suggestStandardValue("construction", "BRUSHED FLEECE", "Knit type").value, null);
  });
});

describe("gaps after a fabric row is matched", () => {
  const cells: SourceCell[] = [
    cell({ header: "Art.", sourceValue: "Q75-MESH", column: "A" }),
    cell({ header: "Knit type", sourceValue: "WARP MESH", column: "B" }),
    cell({ header: "Fibre", sourceValue: "100% SUPIMA COTTON", column: "C" }),
    cell({ header: "GSM", sourceValue: "160", column: "D" }),
    cell({ header: "Width cm", sourceValue: "150", column: "E" }),
    cell({ header: "Colourway", sourceValue: "Navy", column: "F" }),
    cell({ header: "Certificate", sourceValue: "", column: "G" }),
  ];

  it("suggests the six required fields and skips an empty cert", () => {
    const gaps = standardGapsFromCells("dep", cells, resolve);
    assert.deepEqual(
      gaps.map((gap) => gap.field),
      ["article", "construction", "composition", "weight", "width", "colour"],
    );
    assert.equal(gaps.find((gap) => gap.field === "weight")?.suggestion, "160 g/m²");
    assert.equal(gaps.find((gap) => gap.field === "article")?.suggestion, "Q75-MESH");
    assert.equal(
      gaps.find((gap) => gap.field === "cert"),
      undefined,
    );
  });

  it("leaves a field off the list once it already has a standard value", () => {
    const settled = cells.map((item) =>
      item.header === "GSM" ? { ...item, standardField: "weight" as const, standardValue: "160 g/m²" } : item,
    );
    const gaps = standardGapsFromCells("dep", settled, resolve);
    assert.equal(gaps.some((gap) => gap.field === "weight"), false);
  });

  it("suggests a written cert as the mill wrote it", () => {
    const withCert = cells.map((item) =>
      item.header === "Certificate" ? { ...item, sourceValue: "OEKO-TEX Standard 100" } : item,
    );
    const gaps = standardGapsFromCells("dep", withCert, resolve);
    const cert = gaps.find((gap) => gap.field === "cert");
    assert.equal(cert?.suggestion, "OEKO-TEX Standard 100");
    assert.equal(cert?.suggestion?.includes("GOTS"), false);
  });
});
