import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, it } from "node:test";
import { SupplierExceptionGrid } from "../../../components/fruma/SupplierExceptionGrid";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { setTenantPoolForTests } from "../persist/tenant-query";
import {
  joinedCellsFromLedgerRows,
  tenantNamespaceFromSessionCookies,
  type DepositCellLedgerRow,
} from "./deposit-anomaly-loader";
import { loadLiveDepositAnomalies } from "../../../app/(ledger)/deposits/page";

const TEST_PASS = "deposit-loader-password";

type Call = { query: string; args: readonly unknown[] };

function recordingPool(dispatch: (query: string, args: readonly unknown[]) => Record<string, unknown>[]) {
  const calls: Call[] = [];
  const tx = (strings: TemplateStringsArray | string, ...args: readonly unknown[]) => {
    if (typeof strings === "string") return { identifier: strings };
    const query = strings.reduce((sql, part, index) => {
      const arg = args[index - 1];
      const rendered =
        arg && typeof arg === "object" && arg !== null && "identifier" in arg
          ? `"${String((arg as { identifier: string }).identifier)}"`
          : "?";
      return sql + rendered + part;
    });
    calls.push({ query, args });
    const result = Promise.resolve(query.startsWith("SET LOCAL") ? [] : dispatch(query, args));
    return Object.assign(result, { strings, args });
  };
  const pool = {
    async begin<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
      return callback(tx);
    },
  };
  return { pool, calls };
}

function cellRow(
  partial: Pick<DepositCellLedgerRow, "id" | "raw_header" | "source_value" | "col_index"> &
    Partial<DepositCellLedgerRow>,
): DepositCellLedgerRow {
  return {
    deposit_id: "dep-1",
    sheet_name: "mill.csv",
    row_index: 2,
    normalized_value: null,
    event_id: null,
    action_type: null,
    old_standard_value: null,
    new_standard_value: null,
    standard_field: null,
    occurred_at: null,
    ...partial,
  };
}

afterEach(() => {
  setTenantPoolForTests(null);
});

describe("deposit session namespace", () => {
  it("prefers a cookie value that names a tenant schema", async () => {
    const namespace = await tenantNamespaceFromSessionCookies({
      get: () => ({ value: "owen.not-the-schema" }),
      getAll: () => [
        { name: "fruma_demo", value: "owen.not-the-schema" },
        { name: "fruma_env", value: "fruma_production" },
      ],
    });
    assert.equal(namespace, "fruma_production");
  });

  it("uses the founder session cookie name when the value is a session token", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const token = await sessionToken("owen");
    const namespace = await tenantNamespaceFromSessionCookies({
      get: (name) => (name === DEMO_COOKIE ? { value: token } : undefined),
      getAll: () => [{ name: DEMO_COOKIE, value: token }],
    });
    assert.equal(namespace, "fruma_demo");
  });
});

describe("live deposit anomaly loader", () => {
  it("left-joins mutation events, replays occurred_at, and keeps unmapped or unconfirmed cells", async () => {
    const recorded = recordingPool((query) => {
      if (query.includes("FROM fruma_deposits")) return [{ id: "dep-1" }];
      if (query.includes("FROM fruma_header_maps")) return [{ overlays: { mystery: "colour" } }];
      return [
        cellRow({
          id: "cell-weight",
          raw_header: "Weight",
          source_value: "8.2 oz",
          col_index: 1,
          event_id: "evt-weight-confirm",
          action_type: "confirm",
          standard_field: "weight",
          new_standard_value: "278",
          occurred_at: "2026-10-08T02:00:00.000Z",
        }),
        cellRow({
          id: "cell-weight",
          raw_header: "Weight",
          source_value: "8.2 oz",
          col_index: 1,
          event_id: "evt-weight-map",
          action_type: "map",
          standard_field: "weight",
          new_standard_value: "200",
          occurred_at: "2026-10-08T01:00:00.000Z",
        }),
        cellRow({
          id: "cell-width",
          raw_header: "Width",
          source_value: "42 in",
          col_index: 2,
          event_id: "evt-width-map",
          action_type: "map",
          standard_field: "width",
          new_standard_value: "106.68",
          occurred_at: "2026-10-08T01:00:00.000Z",
        }),
        cellRow({
          id: "cell-mystery",
          raw_header: "Mystery",
          source_value: "HX-1",
          col_index: 3,
        }),
      ];
    });
    setTenantPoolForTests(recorded.pool as never);

    const loaded = await loadLiveDepositAnomalies("fruma_test", undefined);
    assert.equal(loaded.depositId, "dep-1");
    assert.deepEqual(
      loaded.anomalies.map((row) => [row.id, row.reason, row.standardField]),
      [
        ["cell-width", "unconfirmed", "width"],
        ["cell-mystery", "unconfirmed", "colour"],
      ],
    );

    const statements = recorded.calls.map((call) => call.query);
    assert.equal(statements.some((query) => query.includes('SET LOCAL search_path TO "fruma_test", public;')), true);
    const cellQuery = statements.find((query) => query.includes("FROM fruma_source_cells"));
    assert.ok(cellQuery);
    assert.match(cellQuery, /LEFT JOIN fruma_cell_mutation_events e ON e\.source_cell_id = c\.id/);
    assert.match(cellQuery, /ORDER BY e\.occurred_at ASC/);
    assert.equal(cellQuery.includes("operator_cookie"), false);
    assert.equal(cellQuery.includes("bytes"), false);
    assert.equal(/\b(?:UPDATE|DELETE|DROP)\b/i.test(statements.join("\n")), false);
  });

  it("reads the requested deposit and does not scan for a newer one", async () => {
    const recorded = recordingPool((query) => {
      if (query.includes("FROM fruma_header_maps")) return [];
      return [];
    });
    setTenantPoolForTests(recorded.pool as never);
    const loaded = await loadLiveDepositAnomalies("fruma_demo", "dep-9");
    assert.equal(loaded.depositId, "dep-9");
    assert.deepEqual(loaded.anomalies, []);
    const cellCall = recorded.calls.find((call) => call.query.includes("FROM fruma_source_cells"));
    assert.deepEqual(cellCall?.args, ["dep-9"]);
    assert.equal(recorded.calls.some((call) => call.query.includes("FROM fruma_deposits")), false);
  });

  it("folds a later confirm over an earlier map when the join arrives out of time order", () => {
    const joined = joinedCellsFromLedgerRows([
      cellRow({
        id: "cell-width",
        raw_header: "Width",
        source_value: "42 in",
        col_index: 2,
        event_id: "evt-late",
        action_type: "confirm",
        occurred_at: "2026-10-08T03:00:00.000Z",
        new_standard_value: "106.68",
      }),
      cellRow({
        id: "cell-width",
        raw_header: "Width",
        source_value: "42 in",
        col_index: 2,
        event_id: "evt-early",
        action_type: "map",
        standard_field: "width",
        occurred_at: "2026-10-08T01:00:00.000Z",
        new_standard_value: "100",
      }),
    ]);
    assert.deepEqual(
      joined[0]?.mutations.map((event) => event.eventId),
      ["evt-early", "evt-late"],
    );
    assert.equal(joined[0]?.mutations[0]?.operatorCookie, "");
  });
});

describe("deposits page source", () => {
  const page = readFileSync(join(process.cwd(), "app/(ledger)/deposits/page.tsx"), "utf8");
  const grid = readFileSync(join(process.cwd(), "components/fruma/SupplierExceptionGrid.tsx"), "utf8");

  it("is a server loader over executeTenantQuery and stays free of mutating statements", () => {
    assert.equal(page.includes('"use client"'), false);
    assert.match(page, /import \{ executeTenantQuery, ledgerSql \} from "@\/src\/lib\/db"/);
    assert.match(page, /await cookies\(\)/);
    assert.match(page, /await searchParams/);
    assert.match(page, /FROM fruma_source_cells c/);
    assert.match(page, /LEFT JOIN fruma_cell_mutation_events e ON e\.source_cell_id = c\.id/);
    assert.match(page, /ORDER BY e\.occurred_at ASC/);
    assert.match(page, /SupplierExceptionGrid/);
    assert.match(page, /border-dashed border-amber-500\/80 bg-amber-500\/5/);
    assert.equal(/\b(?:UPDATE|DELETE|DROP)\b/.test(page), false);
    assert.match(grid, /border-dashed border-amber-500\/80 bg-amber-500\/5/);
  });

  it("renders each anomaly as a dashed amber proposal block", () => {
    const html = renderToStaticMarkup(
      createElement(SupplierExceptionGrid, {
        anomalies: [
          {
            id: "cell-mystery",
            depositId: "dep-1",
            sheet: "mill.csv",
            row: 2,
            column: "C",
            header: "Mystery",
            sourceValue: "HX-1",
            standardField: null,
            standardValue: null,
            normalizedValue: null,
            confirmed: false,
            reason: "unmapped",
          },
        ],
        className: "border-dashed border-amber-500/80 bg-amber-500/5",
      }),
    );
    assert.equal(html.includes("border-dashed border-amber-500/80 bg-amber-500/5"), true);
    assert.match(html, /Parsing anomalies/);
    assert.match(html, /unmapped/);
    assert.match(html, /Mystery/);
  });
});
