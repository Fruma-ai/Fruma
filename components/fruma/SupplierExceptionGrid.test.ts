import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { applyConfirmReplay, type SupplierExceptionRow } from "./SupplierExceptionGrid";

const cotton: SupplierExceptionRow = {
  id: "cell:dep-1:2:C:Hanger",
  sheet: "Hanger",
  row: 2,
  column: "C",
  header: "Composition",
  sourceValue: "100% Cotton Mesh",
  standardField: "composition",
  standardValue: "Cotton",
  reason: "unconfirmed",
};

const wool: SupplierExceptionRow = {
  ...cotton,
  id: "cell:dep-1:3:C:Hanger",
  row: 3,
  sourceValue: "80% Wool / 20% Nylon",
  standardField: null,
  standardValue: null,
  reason: "unmapped",
};

describe("supplier exception confirm replay", () => {
  it("drops a confirmed cell from the anomaly list and keeps the mill source untouched", () => {
    const next = applyConfirmReplay([cotton, wool], {
      source_cell_id: cotton.id,
      target_field: "composition",
      confirmed_value: "100% Cotton Mesh",
    });
    assert.deepEqual(
      next.anomalies.map((row) => row.id),
      [wool.id],
    );
    assert.equal(next.anomalies[0].sourceValue, wool.sourceValue);
    assert.deepEqual(next.confirmed, {
      source_cell_id: cotton.id,
      target_field: "composition",
      confirmed_value: "100% Cotton Mesh",
      confirmed: true,
    });
  });

  it("binds each amber anomaly form to confirmStagedSuggestion", () => {
    const source = readFileSync(new URL("./SupplierExceptionGrid.tsx", import.meta.url), "utf8");
    assert.match(source, /border-dashed border-amber-500\/80 bg-amber-500\/5/);
    assert.match(source, /confirmStagedSuggestion\(\s*payload\s*\)/);
    assert.match(source, /source_cell_id: row\.id/);
    assert.match(source, /target_field: targetField/);
    assert.match(source, /confirmed_value: confirmedValue/);
    assert.match(source, /router\.refresh\(\)/);
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP)\b/);
  });
});
