import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Client } from "../persist/reload-engines";
import {
  GLOBAL_STANDARD_ASTM,
  INTRA_MILL_HISTORICAL_ALIAS,
  generateDeterministicSuggestions,
} from "./deterministic-suggestions";

const MILL_A = "org_mill_vale";
const MILL_B = "org_mill_other";
const DEPOSIT = "dep_current";

type DepositRow = { id: string; supplier_org_id: string };
type CellRow = {
  id: string;
  deposit_id: string;
  raw_header: string;
  source_value: string;
  normalized_value: string | null;
};
type ConfirmRow = {
  source_cell_id: string;
  action_type: "map" | "confirm";
  standard_field: string | null;
  new_standard_value: string | null;
  occurred_at: string;
};
type Call = { query: string; parameters?: readonly unknown[] };

function ledgerClient(options: {
  schema?: string;
  deposits: DepositRow[];
  cells: CellRow[];
  confirms?: ConfirmRow[];
}): Client & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async unsafe(query: string, parameters?: readonly unknown[]) {
      calls.push({ query, parameters });
      if (query.includes("current_schema")) {
        return [{ schema_name: options.schema ?? "fruma_test" }];
      }
      if (query.trim().startsWith("SET search_path")) return [];
      if (query.includes("FROM fruma_source_cells") && query.includes("normalized_value IS NULL")) {
        const depositId = String(parameters?.[0] ?? "");
        const hideConfirmed = query.includes("NOT EXISTS") && query.includes("action_type = 'confirm'");
        return options.cells
          .filter((cell) => {
            if (cell.deposit_id !== depositId || cell.normalized_value != null) return false;
            if (!hideConfirmed) return true;
            return !(options.confirms ?? []).some(
              (event) => event.source_cell_id === cell.id && event.action_type === "confirm",
            );
          })
          .map((cell) => ({
            id: cell.id,
            raw_header: cell.raw_header,
            source_value: cell.source_value,
          }));
      }
      if (query.includes("FROM fruma_cell_mutation_events")) {
        if (!query.includes("standard_field") || !query.includes("new_standard_value")) {
          throw new Error("historical alias must read standard_field and new_standard_value");
        }
        if (!query.includes("supplier_org_id") || !query.includes("action_type = 'confirm'")) {
          throw new Error("historical alias must stay on this mill's confirms");
        }
        if (/\btarget_field\b/.test(query) || /\bstandard_value\b/.test(query)) {
          throw new Error("mutation events have no target_field or standard_value column");
        }
        const header = String(parameters?.[0] ?? "");
        const depositId = String(parameters?.[1] ?? "");
        const mill = options.deposits.find((deposit) => deposit.id === depositId)?.supplier_org_id;
        const matches = (options.confirms ?? [])
          .filter((event) => event.action_type === "confirm")
          .map((event) => {
            const cell = options.cells.find((candidate) => candidate.id === event.source_cell_id);
            const owner = options.deposits.find((deposit) => deposit.id === cell?.deposit_id);
            return { event, cell, owner };
          })
          .filter(
            (row) =>
              row.cell?.raw_header === header &&
              row.owner?.supplier_org_id === mill &&
              row.event.standard_field != null &&
              row.event.new_standard_value != null,
          )
          .sort((a, b) => b.event.occurred_at.localeCompare(a.event.occurred_at));
        const latest = matches[0];
        return latest
          ? [
              {
                standard_field: latest.event.standard_field,
                new_standard_value: latest.event.new_standard_value,
              },
            ]
          : [];
      }
      if (query.includes("INSERT INTO fruma_staged_suggestions")) {
        if (query.includes("ON CONFLICT") || query.includes("fruma_product_truth_facts")) {
          throw new Error("staged suggestions are insert-only and stay out of product-truth facts");
        }
        return [];
      }
      throw new Error(`Unexpected suggestion query: ${query}`);
    },
  };
}

function inserts(client: { calls: Call[] }, source: string): Call[] {
  return client.calls.filter(
    (call) => call.query.includes("INSERT INTO fruma_staged_suggestions") && call.query.includes(source),
  );
}

describe("generateDeterministicSuggestions", () => {
  it("stages global field hits inside the active schema and rewrites known values", async () => {
    const client = ledgerClient({
      deposits: [{ id: DEPOSIT, supplier_org_id: MILL_A }],
      cells: [
        { id: "weight", deposit_id: DEPOSIT, raw_header: "Wgt GSM", source_value: "180", normalized_value: null },
        { id: "width", deposit_id: DEPOSIT, raw_header: "Width CM", source_value: "150", normalized_value: null },
        { id: "moq", deposit_id: DEPOSIT, raw_header: "Min Order", source_value: "500", normalized_value: null },
        { id: "article", deposit_id: DEPOSIT, raw_header: "Art.", source_value: "Q75", normalized_value: null },
        {
          id: "article-cotton",
          deposit_id: DEPOSIT,
          raw_header: "Art.",
          source_value: "100% CO",
          normalized_value: null,
        },
        {
          id: "already-mapped",
          deposit_id: DEPOSIT,
          raw_header: "Wgt GSM",
          source_value: "160",
          normalized_value: "160",
        },
        {
          id: "other-file",
          deposit_id: "dep_other",
          raw_header: "Wgt GSM",
          source_value: "200",
          normalized_value: null,
        },
      ],
    });

    const staged = await generateDeterministicSuggestions(client, `  ${DEPOSIT}  `);

    assert.deepEqual(
      staged.map((row) => [row.sourceCellId, row.targetField, row.suggestedValue, row.derivationSource, row.confidence]),
      [
        ["weight", "weight", "180", GLOBAL_STANDARD_ASTM, 0.95],
        ["width", "width", "150", GLOBAL_STANDARD_ASTM, 0.95],
        ["moq", "moq", "500", GLOBAL_STANDARD_ASTM, 0.95],
        ["article", "article", "Q75", GLOBAL_STANDARD_ASTM, 0.95],
        ["article-cotton", "article", "cotton", GLOBAL_STANDARD_ASTM, 0.95],
      ],
    );
    const written = inserts(client, GLOBAL_STANDARD_ASTM);
    assert.equal(written.length, 5);
    assert.deepEqual(written[4]?.parameters, [DEPOSIT, "article-cotton", "article", "cotton"]);
    assert.equal(inserts(client, INTRA_MILL_HISTORICAL_ALIAS).length, 0);
    assert.equal(
      client.calls.some((call) => call.query.includes("supplier_org_id")),
      false,
    );

    const text = client.calls.map((call) => call.query);
    assert.match(text[0] ?? "", /current_schema/);
    assert.equal(text[1]?.trim(), "SET search_path TO fruma_test;");
    assert.match(text[2] ?? "", /FROM fruma_source_cells/);
    assert.match(text[2] ?? "", /normalized_value IS NULL/);
    assert.deepEqual(client.calls[2]?.parameters, [DEPOSIT]);
    assert.equal(text.some((query) => query.includes("fruma_demo")), false);
    assert.equal(text.some((query) => query.includes("fruma_production")), false);
    assert.equal(text.some((query) => query.includes("fruma_product_truth_facts")), false);
    assert.equal(text.some((query) => query.includes("ON CONFLICT")), false);
  });

  it("uses the latest confirm from this mill when the header is outside the global dictionary", async () => {
    const client = ledgerClient({
      schema: "fruma_demo",
      deposits: [
        { id: "dep_old", supplier_org_id: MILL_A },
        { id: DEPOSIT, supplier_org_id: MILL_A },
        { id: "dep_other_mill", supplier_org_id: MILL_B },
      ],
      cells: [
        {
          id: "prior",
          deposit_id: "dep_old",
          raw_header: "Fibre",
          source_value: "CO",
          normalized_value: "cotton",
        },
        {
          id: "prior-later",
          deposit_id: "dep_old",
          raw_header: "Fibre",
          source_value: "Organic CO",
          normalized_value: "organic cotton",
        },
        {
          id: "other-mill-cell",
          deposit_id: "dep_other_mill",
          raw_header: "Fibre",
          source_value: "PES",
          normalized_value: "polyester",
        },
        {
          id: "mapped-only",
          deposit_id: "dep_old",
          raw_header: "Fibre",
          source_value: "PES",
          normalized_value: null,
        },
        {
          id: "open",
          deposit_id: DEPOSIT,
          raw_header: "Fibre",
          source_value: "PES blend",
          normalized_value: null,
        },
        {
          id: "unknown",
          deposit_id: DEPOSIT,
          raw_header: "Hand",
          source_value: "soft",
          normalized_value: null,
        },
      ],
      confirms: [
        {
          source_cell_id: "prior",
          action_type: "confirm",
          standard_field: "composition",
          new_standard_value: "cotton",
          occurred_at: "2026-09-01T00:00:00.000Z",
        },
        {
          source_cell_id: "prior-later",
          action_type: "confirm",
          standard_field: "composition",
          new_standard_value: "organic cotton",
          occurred_at: "2026-09-02T00:00:00.000Z",
        },
        {
          source_cell_id: "mapped-only",
          action_type: "map",
          standard_field: "composition",
          new_standard_value: "polyester",
          occurred_at: "2026-09-03T00:00:00.000Z",
        },
        {
          source_cell_id: "other-mill-cell",
          action_type: "confirm",
          standard_field: "composition",
          new_standard_value: "polyester",
          occurred_at: "2026-09-04T00:00:00.000Z",
        },
      ],
    });

    const staged = await generateDeterministicSuggestions(client, DEPOSIT);

    assert.deepEqual(staged, [
      {
        depositId: DEPOSIT,
        sourceCellId: "open",
        targetField: "composition",
        suggestedValue: "organic cotton",
        derivationSource: INTRA_MILL_HISTORICAL_ALIAS,
        confidence: 0.85,
      },
    ]);
    const historical = inserts(client, INTRA_MILL_HISTORICAL_ALIAS);
    assert.equal(historical.length, 1);
    assert.deepEqual(historical[0]?.parameters, [DEPOSIT, "open", "composition", "organic cotton"]);
    assert.match(client.calls[1]?.query ?? "", /SET search_path TO fruma_demo;/);
    const lookups = client.calls.filter((call) => call.query.includes("supplier_org_id"));
    assert.deepEqual(
      lookups.map((call) => call.parameters),
      [
        ["Fibre", DEPOSIT],
        ["Hand", DEPOSIT],
      ],
    );
  });

  it("does not consult mill history when the global dictionary already recognizes the cell", async () => {
    const client = ledgerClient({
      deposits: [
        { id: "dep_old", supplier_org_id: MILL_A },
        { id: DEPOSIT, supplier_org_id: MILL_A },
      ],
      cells: [
        {
          id: "prior",
          deposit_id: "dep_old",
          raw_header: "Comp",
          source_value: "cotton",
          normalized_value: "cotton",
        },
        {
          id: "value-only",
          deposit_id: DEPOSIT,
          raw_header: "Comp",
          source_value: "100% organic co",
          normalized_value: null,
        },
        {
          id: "header-wins",
          deposit_id: DEPOSIT,
          raw_header: "Wgt GSM",
          source_value: "140",
          normalized_value: null,
        },
      ],
      confirms: [
        {
          source_cell_id: "prior",
          action_type: "confirm",
          standard_field: "composition",
          new_standard_value: "cotton",
          occurred_at: "2026-09-01T00:00:00.000Z",
        },
      ],
    });

    const staged = await generateDeterministicSuggestions(client, DEPOSIT);

    assert.deepEqual(
      staged.map((row) => [row.sourceCellId, row.targetField, row.suggestedValue, row.derivationSource]),
      [["header-wins", "weight", "140", GLOBAL_STANDARD_ASTM]],
    );
    assert.equal(client.calls.some((call) => call.query.includes("supplier_org_id")), false);
  });

  it("leaves a confirmed cell out of the next proposal pass", async () => {
    const client = ledgerClient({
      deposits: [{ id: DEPOSIT, supplier_org_id: MILL_A }],
      cells: [
        {
          id: "accepted",
          deposit_id: DEPOSIT,
          raw_header: "Fibre",
          source_value: "cotton",
          normalized_value: null,
        },
        {
          id: "open",
          deposit_id: DEPOSIT,
          raw_header: "Wgt GSM",
          source_value: "180",
          normalized_value: null,
        },
      ],
      confirms: [
        {
          source_cell_id: "accepted",
          action_type: "confirm",
          standard_field: "composition",
          new_standard_value: "cotton",
          occurred_at: "2026-09-02T00:00:00.000Z",
        },
      ],
    });

    const staged = await generateDeterministicSuggestions(client, DEPOSIT);
    assert.deepEqual(
      staged.map((row) => row.sourceCellId),
      ["open"],
    );
    const lookup = client.calls.find((call) => call.query.includes("normalized_value IS NULL"));
    assert.match(lookup?.query ?? "", /NOT EXISTS/);
    assert.match(lookup?.query ?? "", /action_type = 'confirm'/);
  });

  it("refuses a connection outside the ledger schemas and an empty deposit id", async () => {
    const outside = ledgerClient({
      schema: "public",
      deposits: [{ id: DEPOSIT, supplier_org_id: MILL_A }],
      cells: [
        { id: "weight", deposit_id: DEPOSIT, raw_header: "Wgt GSM", source_value: "180", normalized_value: null },
      ],
    });
    await assert.rejects(() => generateDeterministicSuggestions(outside, DEPOSIT), /not a Fruma ledger schema/);
    assert.equal(outside.calls.some((call) => call.query.includes("fruma_source_cells")), false);

    const client = ledgerClient({ deposits: [], cells: [] });
    await assert.rejects(() => generateDeterministicSuggestions(client, "   "), /deposit_id_required/);
    assert.equal(client.calls.length, 0);
  });
});
