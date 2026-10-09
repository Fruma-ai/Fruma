import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { validateFibreIntegrity } from "./composition";

describe("fibre integrity", () => {
  const source = readFileSync(new URL("./composition.ts", import.meta.url), "utf8");

  it("stays a pure function with no external imports", () => {
    assert.match(source, /export function validateFibreIntegrity/);
    assert.equal(/^\s*import\s/m.test(source), false);
    assert.equal(source.includes("require("), false);
  });

  it("accepts parts that add to 100", () => {
    assert.deepEqual(validateFibreIntegrity("80% Cotton / 20% Nylon"), {
      isValid: true,
      total: 100,
    });
    assert.deepEqual(validateFibreIntegrity("60% cotton, 20% nylon, 20% elastane"), {
      isValid: true,
      total: 100,
    });
    assert.deepEqual(validateFibreIntegrity("100% Cotton"), { isValid: true, total: 100 });
    assert.deepEqual(validateFibreIntegrity("Cotton 80 % / Nylon 20 %"), {
      isValid: true,
      total: 100,
    });
  });

  it("rejects a sum other than 100 and reports that sum", () => {
    assert.deepEqual(validateFibreIntegrity("80% Cotton / 30% Nylon"), {
      isValid: false,
      total: 110,
      error: "COMPOSITION_INTEGRITY_MISMATCH",
    });
    assert.deepEqual(validateFibreIntegrity("40% wool"), {
      isValid: false,
      total: 40,
      error: "COMPOSITION_INTEGRITY_MISMATCH",
    });
  });

  it("passes a cell that states no percentage integers", () => {
    assert.deepEqual(validateFibreIntegrity(""), { isValid: true, total: 100 });
    assert.deepEqual(validateFibreIntegrity("Cotton / Nylon"), { isValid: true, total: 100 });
    assert.deepEqual(validateFibreIntegrity("CM 30/1"), { isValid: true, total: 100 });
  });

  it("does not treat the digit after a decimal point as its own percentage", () => {
    assert.deepEqual(validateFibreIntegrity("80.5% Cotton / 19.5% Nylon"), {
      isValid: true,
      total: 100,
    });
  });
});
