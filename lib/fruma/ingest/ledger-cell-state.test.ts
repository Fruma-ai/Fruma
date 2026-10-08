import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { FileSpineStore, getSpineStore, setSpineStoreForTests } from "../persist";
import type { JoinedSourceCell, PersistedCellMutation, PersistedSourceCell } from "../persist";
import { handleLedgerCellStateRequest } from "./ledger-cell-state";
import { supplierParsingAnomalies } from "./supplier-anomalies";

const TEST_PASS = "spec8-test-password";

function cell(partial: PersistedSourceCell): PersistedSourceCell {
  return partial;
}

function joined(
  source: PersistedSourceCell,
  mutations: PersistedCellMutation[] = [],
): JoinedSourceCell {
  return { cell: source, supplierOrgId: "org_mill_synthetic", mutations };
}

function event(
  partial: Pick<PersistedCellMutation, "eventId" | "sourceCellId" | "actionType" | "occurredAt"> &
    Partial<PersistedCellMutation>,
): PersistedCellMutation {
  return {
    operatorCookie: "secret-operator-cookie",
    oldStandardValue: null,
    newStandardValue: null,
    standardField: null,
    ...partial,
  };
}

describe("supplier parsing anomalies", () => {
  it("replays mutation events by occurred_at and keeps only unmapped or unconfirmed cells", () => {
    const weight = cell({
      id: "cell-weight",
      depositId: "dep-1",
      sheetName: "mill.csv",
      rowIndex: 2,
      colIndex: 2,
      rawHeader: "Weight",
      sourceValue: "8.2 oz",
      normalizedValue: "278.027125",
    });
    const unknown = cell({
      id: "cell-unknown",
      depositId: "dep-1",
      sheetName: "mill.csv",
      rowIndex: 2,
      colIndex: 3,
      rawHeader: "Art.",
      sourceValue: "HX-1",
      normalizedValue: null,
    });
    const weave = cell({
      id: "cell-weave",
      depositId: "dep-1",
      sheetName: "mill.csv",
      rowIndex: 2,
      colIndex: 4,
      rawHeader: "Weave",
      sourceValue: "Twill",
      normalizedValue: null,
    });
    const width = cell({
      id: "cell-width",
      depositId: "dep-1",
      sheetName: "mill.csv",
      rowIndex: 2,
      colIndex: 5,
      rawHeader: "Width",
      sourceValue: "42 in",
      normalizedValue: "106.68",
    });

    const anomalies = supplierParsingAnomalies([
      joined(width, [
        event({
          eventId: "evt-width-confirm",
          sourceCellId: width.id,
          actionType: "confirm",
          occurredAt: "2026-10-08T03:00:00.000Z",
          newStandardValue: "106.68",
        }),
        event({
          eventId: "evt-width-map",
          sourceCellId: width.id,
          actionType: "map",
          occurredAt: "2026-10-08T01:00:00.000Z",
          standardField: "width",
          newStandardValue: "42",
        }),
      ]),
      joined(weave, [
        event({
          eventId: "evt-weave-late",
          sourceCellId: weave.id,
          actionType: "map",
          occurredAt: "2026-10-08T02:00:00.000Z",
          standardField: "construction",
          newStandardValue: "twill",
        }),
        event({
          eventId: "evt-weave-early",
          sourceCellId: weave.id,
          actionType: "map",
          occurredAt: "2026-10-08T01:00:00.000Z",
          standardField: "composition",
          newStandardValue: "cotton",
        }),
      ]),
      joined(unknown),
      joined(weight),
    ]);

    assert.deepEqual(
      anomalies.map((row) => [row.id, row.reason, row.standardField, row.standardValue, row.sourceValue]),
      [
        ["cell-weight", "unconfirmed", "weight", null, "8.2 oz"],
        ["cell-unknown", "unmapped", null, null, "HX-1"],
        ["cell-weave", "unconfirmed", "construction", "twill", "Twill"],
      ],
    );
    assert.equal(anomalies.some((row) => row.id === "cell-width"), false);
    assert.equal(anomalies.find((row) => row.id === "cell-weight")?.normalizedValue, "278.027125");
  });
});

describe("GET /api/mill/cell-state", { concurrency: 1 }, () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fruma-cell-state-"));
    setSpineStoreForTests(new FileSpineStore(dir));
  });

  afterEach(() => {
    setSpineStoreForTests(null);
  });

  it("reads the source-cell left join in occurred_at order and styles the exception grid", () => {
    const mapping = readFileSync(join(process.cwd(), "lib/fruma/ingest/ledger-cell-state.ts"), "utf8");
    const store = readFileSync(join(process.cwd(), "lib/fruma/persist/postgres-store.ts"), "utf8");
    const grid = readFileSync(join(process.cwd(), "components/fruma/SupplierExceptionGrid.tsx"), "utf8");
    const route = readFileSync(join(process.cwd(), "app/api/mill/cell-state/route.ts"), "utf8");
    assert.match(route, /export async function GET\(request: Request\)/);
    assert.match(mapping, /listSourceCellsWithMutations/);
    assert.match(mapping, /latestActiveHeaderMap/);
    const handler = mapping.slice(mapping.indexOf("export async function handleLedgerCellStateRequest"));
    const founderAt = handler.indexOf("await requireTestFounder(request)");
    const readAt = handler.indexOf("readSupplierParsingAnomalies(");
    assert.equal(founderAt >= 0 && founderAt < readAt, true);
    assert.equal(mapping.includes("getDepositBytes"), false);
    const start = store.indexOf("async listSourceCellsWithMutations");
    const end = store.indexOf("async latestActiveHeaderMap");
    const body = store.slice(start, end);
    assert.match(body, /fruma_source_cells/);
    assert.match(body, /LEFT JOIN/);
    assert.match(body, /fruma_cell_mutation_events/);
    assert.match(body, /ORDER BY e\.occurred_at ASC/);
    assert.match(grid, /border-dashed border-amber-500\/80 bg-amber-500\/5/);
  });

  it("returns 401 without a founder cookie and omits confirmed cells", async () => {
    const missing = await handleLedgerCellStateRequest(new Request("http://localhost/api/mill/cell-state"));
    assert.equal(missing.status, 401);

    const store = getSpineStore("demo");
    await store.saveDepositPointer(
      {
        depositId: "dep-1",
        supplierOrgId: "org_mill_synthetic",
        filename: "mill.csv",
        sha256: "a".repeat(64),
        byteLength: 4,
        receivedAt: "2026-10-08T00:00:00.000Z",
        objectKey: "dep-1.bin",
      },
      Uint8Array.from([1, 2, 3, 4]),
    );
    await store.saveDepositPointer(
      {
        depositId: "dep-2",
        supplierOrgId: "org_mill_synthetic",
        filename: "other.csv",
        sha256: "b".repeat(64),
        byteLength: 4,
        receivedAt: "2026-10-08T00:00:00.000Z",
        objectKey: "dep-2.bin",
      },
      Uint8Array.from([5, 6, 7, 8]),
    );
    await store.saveSourceCells([
      cell({
        id: "cell-unknown",
        depositId: "dep-1",
        sheetName: "mill.csv",
        rowIndex: 2,
        colIndex: 1,
        rawHeader: "Art.",
        sourceValue: "HX-1",
        normalizedValue: null,
      }),
      cell({
        id: "cell-width",
        depositId: "dep-1",
        sheetName: "mill.csv",
        rowIndex: 2,
        colIndex: 2,
        rawHeader: "Width",
        sourceValue: "42 in",
        normalizedValue: null,
      }),
      cell({
        id: "cell-other",
        depositId: "dep-2",
        sheetName: "other.csv",
        rowIndex: 2,
        colIndex: 1,
        rawHeader: "Mystery",
        sourceValue: "nope",
        normalizedValue: null,
      }),
    ]);
    await store.appendCellMutation(
      event({
        eventId: "evt-width-map",
        sourceCellId: "cell-width",
        actionType: "map",
        occurredAt: "2026-10-08T01:00:00.000Z",
        standardField: "width",
        newStandardValue: "106.68",
      }),
    );
    await store.appendCellMutation(
      event({
        eventId: "evt-width-confirm",
        sourceCellId: "cell-width",
        actionType: "confirm",
        occurredAt: "2026-10-08T02:00:00.000Z",
        newStandardValue: "106.68",
      }),
    );

    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = `${DEMO_COOKIE}=${await sessionToken("owen")}`;
    const result = await handleLedgerCellStateRequest(
      new Request("http://localhost/api/mill/cell-state?depositId=dep-1", {
        headers: { cookie, "x-fruma-version": "demo" },
      }),
    );
    assert.equal(result.status, 200);
    if (result.status !== 200) return;
    assert.deepEqual(
      result.body.anomalies.map((row) => row.id),
      ["cell-unknown"],
    );
    const all = await handleLedgerCellStateRequest(
      new Request("http://localhost/api/mill/cell-state", {
        headers: { cookie, "x-fruma-version": "demo" },
      }),
    );
    assert.equal(all.status, 200);
    if (all.status !== 200) return;
    assert.deepEqual(
      all.body.anomalies.map((row) => row.id),
      ["cell-unknown", "cell-other"],
    );
    assert.equal(result.body.anomalies[0]?.reason, "unmapped");
    assert.equal(JSON.stringify(result.body).includes("secret-operator-cookie"), false);
    assert.equal(JSON.stringify(result.body).includes("bytes"), false);
  });
});
