import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { interceptCrossSchemaAccess } from "./interceptor";

describe("cross-schema mutation firewall", () => {
  const source = readFileSync(new URL("./interceptor.ts", import.meta.url), "utf8");

  it("stays a pure function with no external imports", () => {
    assert.match(source, /export function interceptCrossSchemaAccess/);
    assert.equal(/^\s*import\s/m.test(source), false);
    assert.equal(source.includes("require("), false);
  });

  it("allows unqualified SQL and a search_path assignment", () => {
    assert.deepEqual(interceptCrossSchemaAccess("SELECT id FROM fruma_deposits"), { isSafe: true });
    assert.deepEqual(
      interceptCrossSchemaAccess("SET LOCAL search_path TO fruma_demo, public"),
      { isSafe: true },
    );
    assert.deepEqual(interceptCrossSchemaAccess(""), { isSafe: true });
  });

  it("blocks dot-notation into each protected schema, including spaced and mixed-case forms", () => {
    for (const query of [
      "SELECT * FROM fruma_production.fruma_deposits",
      "select * from fruma_test.fruma_source_cells",
      "INSERT INTO FRUMA_DEMO . fruma_factory_profiles (mill_org_id) VALUES ('x')",
      "WITH stolen AS (SELECT 1)\nSELECT * FROM\tfruma_demo.fruma_cell_mutation_events",
    ]) {
      assert.deepEqual(interceptCrossSchemaAccess(query), {
        isSafe: false,
        error: "CROSS_SCHEMA_INJECTION_VIOLATION",
      });
    }
  });
});
