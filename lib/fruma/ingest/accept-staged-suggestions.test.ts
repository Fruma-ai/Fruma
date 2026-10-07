import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Client } from "../persist/reload-engines";
import { resolveActiveCell } from "./cell-mutations";
import { acceptStagedSuggestions } from "./accept-staged-suggestions";
import { convertInchToCm, convertOunceToGsm, formatConverted, uniformValue } from "./units";

const DEPOSIT = "dep_current";
const OPERATOR = "owen.session-token";

type StagedRow = {
  source_cell_id: string;
  deposit_id: string;
  target_field: string;
  suggested_value: string;
  source_value: string;
  created_at: string;
};

type Call = { query: string; parameters?: readonly unknown[] };

function ledgerClient(options: {
  schema?: string;
  staged: StagedRow[];
}): Client & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async unsafe(query: string, parameters?: readonly unknown[]) {
      calls.push({ query, parameters });
      if (query.includes("current_schema")) return [{ schema_name: options.schema ?? "fruma_test" }];
      if (query.trim().startsWith("SET search_path")) return [];
      if (query.includes("FROM fruma_staged_suggestions")) {
        const sourceCellId = String(parameters?.[0] ?? "");
        const depositId = String(parameters?.[1] ?? "");
        const matches = options.staged
          .filter((row) => row.source_cell_id === sourceCellId && row.deposit_id === depositId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const latest = matches[0];
        return latest
          ? [
              {
                target_field: latest.target_field,
                suggested_value: latest.suggested_value,
                source_value: latest.source_value,
              },
            ]
          : [];
      }
      if (query.includes("INSERT INTO fruma_cell_mutation_events")) {
        if (!query.includes("event_id") || !query.includes("standard_field") || !query.includes("new_standard_value")) {
          throw new Error("confirm events need an id, a field, and a new value");
        }
        if (query.includes("UPDATE") || query.includes("ON CONFLICT") || query.includes("fruma_source_cells")) {
          throw new Error("accept must not rewrite the deposited source cell");
        }
        return [];
      }
      throw new Error(`Unexpected accept query: ${query}`);
    },
  };
}

describe("acceptStagedSuggestions", () => {
  it("converts ounces and inches through the unit engine and keeps other text", () => {
    assert.equal(uniformValue("weight", "8.2 oz", "8.2 oz"), formatConverted(convertOunceToGsm(8.2)));
    assert.equal(uniformValue("width", '42"', "42"), formatConverted(convertInchToCm(42)));
    assert.equal(uniformValue("weight", "180 gsm", "180"), "180");
    assert.equal(uniformValue("width", "150 cm", "150 cm"), "150 cm");
    assert.equal(uniformValue("width", "single jersey", "single jersey"), "single jersey");
    assert.equal(uniformValue("composition", "100% CO", "cotton"), "cotton");
  });

  it("appends one confirm per selected cell inside the active schema", async () => {
    const client = ledgerClient({
      staged: [
        {
          source_cell_id: "weight",
          deposit_id: DEPOSIT,
          target_field: "weight",
          suggested_value: "8.2 oz",
          source_value: "8.2 oz",
          created_at: "2026-10-01T00:00:00.000Z",
        },
        {
          source_cell_id: "width",
          deposit_id: DEPOSIT,
          target_field: "width",
          suggested_value: "42",
          source_value: '42"',
          created_at: "2026-10-01T00:00:00.000Z",
        },
        {
          source_cell_id: "article",
          deposit_id: DEPOSIT,
          target_field: "article",
          suggested_value: "Q75",
          source_value: "Q75",
          created_at: "2026-10-01T00:00:00.000Z",
        },
        {
          source_cell_id: "article",
          deposit_id: DEPOSIT,
          target_field: "article",
          suggested_value: "OLD",
          source_value: "Q75",
          created_at: "2026-09-01T00:00:00.000Z",
        },
        {
          source_cell_id: "other-deposit",
          deposit_id: "dep_other",
          target_field: "colour",
          suggested_value: "navy",
          source_value: "Navy",
          created_at: "2026-10-01T00:00:00.000Z",
        },
      ],
    });

    const accepted = await acceptStagedSuggestions(
      client,
      `  ${DEPOSIT}  `,
      ["weight", "width", "missing", "article", "weight", "other-deposit"],
      OPERATOR,
    );

    assert.deepEqual(
      accepted.map((row) => [row.sourceCellId, row.targetField, row.normalizedValue]),
      [
        ["weight", "weight", formatConverted(convertOunceToGsm(8.2))],
        ["width", "width", formatConverted(convertInchToCm(42))],
        ["article", "article", "Q75"],
      ],
    );
    const inserts = client.calls.filter((call) => call.query.includes("INSERT INTO fruma_cell_mutation_events"));
    assert.equal(inserts.length, 3);
    assert.deepEqual(inserts[0]?.parameters?.slice(1), [
      "weight",
      OPERATOR,
      formatConverted(convertOunceToGsm(8.2)),
      "weight",
      inserts[0]?.parameters?.[5],
    ]);
    assert.match(String(inserts[0]?.parameters?.[0]), /^[0-9a-f-]{36}$/);
    assert.equal(client.calls.some((call) => /\bUPDATE\b/.test(call.query)), false);
    assert.equal(client.calls.some((call) => call.query.includes("ON CONFLICT")), false);
    assert.equal(client.calls.some((call) => call.query.includes("fruma_product_truth_facts")), false);

    const text = client.calls.map((call) => call.query);
    assert.match(text[0] ?? "", /current_schema/);
    assert.equal(text[1]?.trim(), "SET search_path TO fruma_test;");
    assert.equal(text.some((query) => query.includes("fruma_demo")), false);
    assert.equal(text.some((query) => query.includes("fruma_production")), false);

    const active = resolveActiveCell(
      {
        pointer: { sheet: "book", row: 2, column: "B" },
        sourceValue: "8.2 oz",
        header: "Wgt",
      },
      [
        {
          eventId: accepted[0]!.eventId,
          sourceCellId: "weight",
          operatorCookie: OPERATOR,
          actionType: "confirm",
          oldStandardValue: null,
          newStandardValue: accepted[0]!.normalizedValue,
          standardField: "weight",
          occurredAt: "2026-10-07T00:00:00.000Z",
        },
      ],
    );
    assert.equal(active.sourceValue, "8.2 oz");
    assert.equal(active.standardField, "weight");
    assert.equal(active.standardValue, formatConverted(convertOunceToGsm(8.2)));
    assert.equal(active.confirmed, true);
    assert.equal(active.normalizedValue, undefined);
  });

  it("refuses a connection outside the ledger schemas", async () => {
    const client = ledgerClient({
      schema: "public",
      staged: [
        {
          source_cell_id: "weight",
          deposit_id: DEPOSIT,
          target_field: "weight",
          suggested_value: "180",
          source_value: "180",
          created_at: "2026-10-01T00:00:00.000Z",
        },
      ],
    });
    await assert.rejects(
      () => acceptStagedSuggestions(client, DEPOSIT, ["weight"], OPERATOR),
      /not a Fruma ledger schema/,
    );
    assert.equal(client.calls.some((call) => call.query.includes("fruma_staged_suggestions")), false);
  });
});
