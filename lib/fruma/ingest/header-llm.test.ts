import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { SourceCell } from "./types";
import {
  HEADER_MAP_SYSTEM_PROMPT,
  assertAppendOnlySuggestionSql,
  headerMappingsFromLlmJson,
  stageUnmappedHeaderSuggestions,
  unmappedHeaderCells,
  type SuggestionSql,
} from "./header-llm";

function cell(header: string, sourceValue: string, standardField?: SourceCell["standardField"]): SourceCell {
  return {
    pointer: { sheet: "mill.csv", row: 2, column: header === "Art." ? "A" : "B" },
    header,
    sourceValue,
    ...(standardField ? { standardField } : {}),
  };
}

function recordingSql() {
  const calls: { text: string; args: readonly unknown[] }[] = [];
  const tag = (strings: TemplateStringsArray, ...args: readonly unknown[]) => {
    calls.push({ text: strings.join("?"), args });
    return Promise.resolve([]);
  };
  const sql = Object.assign(tag, {
    async begin<T>(callback: (tx: typeof tag) => Promise<T>): Promise<T> {
      return callback(tag);
    },
  }) as SuggestionSql;
  return { sql, calls };
}

describe("header map proposals", () => {
  it("asks the model to use only the nine standard fields", () => {
    for (const field of ["article", "construction", "composition", "weight", "width", "colour", "moq", "customer", "cert"]) {
      assert.match(HEADER_MAP_SYSTEM_PROMPT, new RegExp(`\\b${field}\\b`));
    }
    assert.match(HEADER_MAP_SYSTEM_PROMPT, /Do not emit SQL/);
    assert.doesNotMatch(HEADER_MAP_SYSTEM_PROMPT, /\b(?:UPDATE|DELETE|DROP)\b/);
  });

  it("keeps unmapped raw headers and drops a mapped column", () => {
    const rows = unmappedHeaderCells("dep-1", [
      cell("Art.", "HX-1"),
      cell("Weight", "8.2 oz", "weight"),
      cell("  ", "ignored"),
    ]);
    assert.deepEqual(
      rows.map((row) => row.rawHeader),
      ["Art."],
    );
    assert.equal(rows[0]?.sourceValue, "HX-1");
    assert.match(rows[0]?.sourceCellId ?? "", /^cell:dep-1:2:A:/);
  });

  it("drops invented fields, unknown headers, and confidence outside 0 to 1", () => {
    const mappings = headerMappingsFromLlmJson(
      JSON.stringify({
        mappings: [
          { raw_header: "Art.", target_field: "article", confidence: 0.91 },
          { raw_header: "Art.", target_field: "composition", confidence: 0.2 },
          { raw_header: "Mystery", target_field: "colour", confidence: 0.8 },
          { raw_header: "GSM", target_field: "gsm", confidence: 0.99 },
          { raw_header: "GSM", target_field: "weight", confidence: 1.4 },
          { raw_header: "Shade", target_field: "colour", confidence: 0 },
        ],
      }),
      ["Art.", "GSM", "Shade"],
    );
    assert.deepEqual(mappings, [
      { rawHeader: "Art.", targetField: "article", confidence: 0.91 },
      { rawHeader: "Shade", targetField: "colour", confidence: 0 },
    ]);
  });

  it("inserts proposal rows and leaves source cells untouched", async () => {
    const recorded = recordingSql();
    const cells = unmappedHeaderCells("dep-9", [
      cell("Art.", "HX-1"),
      { ...cell("Art.", "HX-2"), pointer: { sheet: "mill.csv", row: 3, column: "A" } },
      cell("Shade", "navy"),
    ]);
    const staged = await stageUnmappedHeaderSuggestions({
      rawHeaders: cells.map((row) => row.rawHeader),
      cells,
      complete: async (system, user) => {
        assert.equal(system, HEADER_MAP_SYSTEM_PROMPT);
        assert.match(user, /"Art\."/);
        assert.match(user, /"Shade"/);
        return JSON.stringify({
          mappings: [
            { raw_header: "Art.", target_field: "article", confidence: 0.8 },
            { raw_header: "Shade", target_field: "colour", confidence: 0.7 },
          ],
        });
      },
      sql: recorded.sql,
    });
    assert.equal(staged.length, 3);
    assert.deepEqual(
      staged.map((row) => [row.targetField, row.suggestedValue]),
      [
        ["article", "HX-1"],
        ["article", "HX-2"],
        ["colour", "navy"],
      ],
    );
    assert.equal(recorded.calls.length, 3);
    for (const call of recorded.calls) {
      assert.match(call.text, /INSERT INTO fruma_staged_suggestions/);
      assert.equal(/\b(?:UPDATE|DELETE|DROP)\b/i.test(call.text), false);
      assert.equal(call.text.includes("fruma_source_cells"), false);
      assert.equal(call.args.includes("LLM_HEADER_MAP"), true);
    }
    assert.deepEqual(recorded.calls[0]?.args.slice(0, 4), ["dep-9", staged[0]?.sourceCellId, "article", "HX-1"]);
  });

  it("refuses a destructive statement before a connection would run it", () => {
    assert.throws(
      () => assertAppendOnlySuggestionSql("UPDATE fruma_source_cells SET raw_header = 'x'"),
      /CRITICAL_VIOLATION/,
    );
    assert.throws(
      () => assertAppendOnlySuggestionSql("INSERT INTO fruma_source_cells (id) VALUES ('x')"),
      /fruma_source_cells/,
    );
    assert.throws(
      () => assertAppendOnlySuggestionSql("DELETE FROM fruma_staged_suggestions"),
      /CRITICAL_VIOLATION/,
    );
  });
});

describe("deposits route source", () => {
  const route = readFileSync(join(process.cwd(), "app/api/mill/deposits/route.ts"), "utf8");

  it("stages proposals from the deposit route and does not write source cells", () => {
    assert.match(route, /stageUnmappedHeaderSuggestions/);
    assert.match(route, /uniqueRawHeaders/);
    assert.equal(/\b(?:UPDATE|DELETE|DROP)\b/.test(route), false);
    assert.equal(route.includes("fruma_source_cells"), false);
  });
});
