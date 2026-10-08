import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStandardField, STANDARD_FIELDS } from "./types";
import { convertInchToCm, convertOunceToGsm, formatConverted, normalizedValueFor } from "./units";

describe("Fruma nine-field standard and unit conversion", () => {
  it("exposes exactly the nine standard fields", () => {
    assert.deepEqual(STANDARD_FIELDS, [
      "article",
      "construction",
      "composition",
      "weight",
      "width",
      "colour",
      "moq",
      "customer",
      "cert",
    ]);
    assert.equal(isStandardField("weight"), true);
    assert.equal(isStandardField("gsm"), false);
    assert.equal(isStandardField("structure"), false);
    assert.equal(isStandardField("widthCm"), false);
  });

  it("converts ounces to gsm and inches to centimetres", () => {
    assert.equal(convertOunceToGsm(1), 33.905747);
    assert.equal(convertInchToCm(1), 2.54);
    assert.equal(normalizedValueFor("weight", "8.2 OZ"), formatConverted(convertOunceToGsm(8.2)));
    assert.equal(normalizedValueFor("width", '68"'), formatConverted(convertInchToCm(68)));
    assert.equal(normalizedValueFor("weight", "185gr"), null);
    assert.equal(normalizedValueFor("weight", "285 G/M2"), null);
    assert.equal(normalizedValueFor("width", "160cm"), null);
    assert.equal(normalizedValueFor("construction", "8.2 OZ"), null);
  });
});
