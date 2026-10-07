import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { handleDesignRefusalsRequest } from "../design/refusals-http";
import { sourceCellId } from "../ingest/cell-mutations";
import { sha256Hex } from "../ingest/hash";
import { handleMillQualitiesRequest } from "../ingest/qualities-http";
import { STANDARD_FIELDS } from "../ingest/types";
import { confirmedHeaderOverlays, resetHeaderOverlaysForTests } from "../intelligence/overlays";
import type { ProductTruthRecord } from "../product-truth";
import { IdempotencyException } from "./idempotency";
import { FileSpineStore, PostgresSpineStore, setSpineStoreForTests } from "./index";
import type { SpineStore } from "./types";
import { dropSchemaStatement, ledgerSchemaName, searchPathStatement } from "./postgres-schema";
import {
  activeEngineCache,
  reloadEnginesFromDatabase,
  resetEngineCacheForTests,
  type Client,
} from "./reload-engines";

const TEST_PASS = "lifecycle-test-password";
const SUPPLIER_ORG_ID = "org_mill_test";
const DEPOSIT_ID = "dep-lifecycle";
const PRODUCT_ID = "prod-lifecycle";
const SHEET = "mill.csv";
const FILE_BYTES = Uint8Array.from([70, 114, 117, 109, 97, 45, 109, 105, 108, 108]);

const articleCellId = sourceCellId(DEPOSIT_ID, { sheet: SHEET, row: 2, column: "A" });
const compositionCellId = sourceCellId(DEPOSIT_ID, { sheet: SHEET, row: 2, column: "B" });
const weaveCellId = sourceCellId(DEPOSIT_ID, { sheet: SHEET, row: 2, column: "C" });

type HistoryFile = {
  headerMaps: Array<{
    surface: string;
    overlays: Record<string, string>;
    updatedAt: string;
    version: number;
  }>;
  productTruth: ProductTruthRecord[];
};

function sessionRequest(path: string, depositId?: string): Request {
  const url = new URL(path, "http://localhost");
  if (depositId) url.searchParams.set("depositId", depositId);
  return new Request(url, {
    method: "GET",
    headers: {
      cookie: `${DEMO_COOKIE}=${process.env.FRUMA_LIFECYCLE_COOKIE ?? ""}`,
      "x-fruma-version": "test",
    },
  });
}

/** Answers the reload queries from the file spine as schema fruma_test. */
function fileSchemaClient(dir: string): Client {
  return {
    async unsafe(query: string) {
      if (query.includes("current_schema")) return [{ schema_name: "fruma_test" }];
      const snap = JSON.parse(readFileSync(join(dir, "spine.json"), "utf8")) as HistoryFile;
      if (query.includes("fruma_header_maps")) {
        const best = new Map<string, HistoryFile["headerMaps"][number]>();
        for (const row of snap.headerMaps ?? []) {
          const prev = best.get(row.surface);
          if (!prev || row.version > prev.version) best.set(row.surface, row);
        }
        return [...best.values()].map((row) => ({
          surface: row.surface,
          overlays: row.overlays,
          updated_at: row.updatedAt,
          version: row.version,
        }));
      }
      if (query.includes("fruma_product_truth")) {
        const best = new Map<string, ProductTruthRecord>();
        for (const row of snap.productTruth ?? []) {
          const prev = best.get(row.productId);
          if (!prev || row.version > prev.version) best.set(row.productId, row);
        }
        return [...best.values()].map((row) => ({
          product_id: row.productId,
          version: row.version,
          payload: row,
        }));
      }
      throw new Error(`Unexpected ledger query: ${query}`);
    },
  };
}

async function productTruthHistory(store: SpineStore, dir: string): Promise<ProductTruthRecord[]> {
  if (store.kind === "file") {
    const snap = JSON.parse(readFileSync(join(dir, "spine.json"), "utf8")) as HistoryFile;
    return (snap.productTruth ?? [])
      .filter((row) => row.productId === PRODUCT_ID)
      .sort((a, b) => a.version - b.version);
  }
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL ?? "", {
    max: 1,
    prepare: false,
    connection: { options: "-c search_path=fruma_test" },
  });
  try {
    await sql.unsafe(searchPathStatement("test"));
    const rows = await sql<Array<{ version: number; payload: ProductTruthRecord }>[]>`
      SELECT version, payload
      FROM fruma_test.fruma_product_truth
      WHERE product_id = ${PRODUCT_ID}
      ORDER BY version ASC
    `;
    return rows.map((row) => {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      return { ...payload, version: Number(row.version) };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function reloadTestSchema(store: SpineStore, dir: string) {
  resetHeaderOverlaysForTests();
  resetEngineCacheForTests();
  if (store.kind === "postgres") {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL ?? "", {
      max: 1,
      prepare: false,
      connection: { options: "-c search_path=fruma_test" },
    });
    try {
      await sql.unsafe(searchPathStatement("test"));
      return await reloadEnginesFromDatabase(sql);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
  return reloadEnginesFromDatabase(fileSchemaClient(dir));
}

describe("schema-isolated append-only ledger lifecycle", { concurrency: 1 }, () => {
  const dir = mkdtempSync(join(tmpdir(), "fruma-ledger-lifecycle-"));

  afterEach(() => {
    setSpineStoreForTests(null);
    resetHeaderOverlaysForTests();
    resetEngineCacheForTests();
  });

  it("deposits, mutates, versions product truth, reloads, and reads qualities and refusals", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    process.env.FRUMA_LIFECYCLE_COOKIE = await sessionToken("owen");

    assert.equal(ledgerSchemaName("test"), "fruma_test");
    assert.equal(dropSchemaStatement("test"), "DROP SCHEMA IF EXISTS fruma_test CASCADE;");

    const databaseUrl = process.env.DATABASE_URL?.trim();
    const store: SpineStore = databaseUrl
      ? new PostgresSpineStore("test")
      : new FileSpineStore(dir);
    setSpineStoreForTests(store);

    // 1. Clean fruma_test. Postgres reset drops that schema. The file spine resets the test directory.
    await store.reset();
    const emptied = await store.load();
    assert.equal(emptied.deposits.length, 0);
    assert.equal(emptied.sourceCells.length, 0);
    assert.equal(emptied.productTruth.length, 0);

    // 2. Mock multipart upload: hash the bytes, then persist the pointer and cells.
    const byteHash = sha256Hex(FILE_BYTES);
    await store.saveDepositPointer(
      {
        depositId: DEPOSIT_ID,
        supplierOrgId: SUPPLIER_ORG_ID,
        filename: SHEET,
        sha256: byteHash,
        byteLength: FILE_BYTES.byteLength,
        receivedAt: "2026-10-07T12:00:00.000Z",
        objectKey: `${DEPOSIT_ID}.bin`,
      },
      FILE_BYTES,
    );
    await store.saveSourceCells([
      {
        id: articleCellId,
        depositId: DEPOSIT_ID,
        sheetName: SHEET,
        rowIndex: 2,
        colIndex: 1,
        rawHeader: "Art. No",
        sourceValue: "HX-100",
        normalizedValue: null,
      },
      {
        id: compositionCellId,
        depositId: DEPOSIT_ID,
        sheetName: SHEET,
        rowIndex: 2,
        colIndex: 2,
        rawHeader: "Comp.",
        sourceValue: "100% cotton",
        normalizedValue: null,
      },
      {
        id: weaveCellId,
        depositId: DEPOSIT_ID,
        sheetName: SHEET,
        rowIndex: 2,
        colIndex: 3,
        rawHeader: "Weave",
        sourceValue: "Twill",
        normalizedValue: null,
      },
    ]);
    const deposited = await store.load();
    assert.equal(deposited.deposits[0]?.sha256, byteHash);
    assert.equal(deposited.sourceCells.length, 3);

    // 3. The same bytes under a new deposit id are rejected.
    await assert.rejects(
      () =>
        store.saveDepositPointer(
          {
            depositId: "dep-lifecycle-repeat",
            supplierOrgId: SUPPLIER_ORG_ID,
            filename: SHEET,
            sha256: byteHash,
            byteLength: FILE_BYTES.byteLength,
            receivedAt: "2026-10-07T12:05:00.000Z",
            objectKey: "dep-lifecycle-repeat.bin",
          },
          FILE_BYTES,
        ),
      (err: unknown) => err instanceof IdempotencyException && err.conflict === "byte_hash",
    );
    assert.equal((await store.load()).deposits.length, 1);

    // 4. Append map events. Composition moves from unmapped to the standard field.
    await store.appendCellMutation({
      eventId: "evt-article",
      sourceCellId: articleCellId,
      operatorCookie: "founder=owen",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "HX-100",
      standardField: "article",
      occurredAt: "2026-10-07T12:10:00.000Z",
    });
    await store.appendCellMutation({
      eventId: "evt-composition",
      sourceCellId: compositionCellId,
      operatorCookie: "founder=owen",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "cotton",
      standardField: "composition",
      occurredAt: "2026-10-07T12:11:00.000Z",
    });
    const mapped = await store.load();
    assert.equal(mapped.sourceCells.find((cell) => cell.id === compositionCellId)?.sourceValue, "100% cotton");
    assert.equal(mapped.cellMutations.length, 2);

    await store.saveHeaderMap({
      surface: "test",
      overlays: { "art. no": "article", "comp.": "composition" },
      updatedAt: "2026-10-07T12:12:00.000Z",
    });

    // 5. Version 1 product truth. The mill fact points at the composition SourceCell.id.
    await store.saveProductTruth({
      productId: PRODUCT_ID,
      version: 1,
      evidence: [],
      facts: [
        {
          id: "fact-composition-v1",
          productId: PRODUCT_ID,
          field: "composition",
          value: "100% cotton",
          sourceType: "mill-file",
          sourceCellId: compositionCellId,
          depositId: DEPOSIT_ID,
          scope: "quality",
          status: "evidenced",
          version: 1,
        },
      ],
    });

    // 6. Version 2 is a new row. Version 1 stays in the history with its original fact.
    await store.saveProductTruth({
      productId: PRODUCT_ID,
      version: 1,
      evidence: [],
      facts: [
        {
          id: "fact-composition-v2",
          productId: PRODUCT_ID,
          field: "composition",
          value: "cotton",
          sourceType: "mill-file",
          sourceCellId: compositionCellId,
          depositId: DEPOSIT_ID,
          scope: "quality",
          status: "evidenced",
          version: 1,
        },
      ],
    });
    const history = await productTruthHistory(store, dir);
    assert.deepEqual(
      history.map((row) => row.version),
      [1, 2],
    );
    assert.equal(history[0]?.facts[0]?.value, "100% cotton");
    assert.equal(history[0]?.facts[0]?.sourceCellId, compositionCellId);
    assert.equal(history[0]?.facts[0]?.version, 1);
    assert.equal(history[1]?.facts[0]?.value, "cotton");
    assert.equal(history[1]?.facts[0]?.sourceCellId, compositionCellId);
    assert.equal(history[1]?.facts[0]?.version, 2);
    const current = (await store.load()).productTruth.find((row) => row.productId === PRODUCT_ID);
    assert.equal(current?.version, 2);
    assert.equal(current?.facts[0]?.value, "cotton");

    // 7. Cold reboot: empty the in-memory caches, then reload from the test schema.
    const restored = await reloadTestSchema(store, dir);
    assert.equal(restored.productTruth[0]?.version, 2);
    assert.equal(restored.productTruth[0]?.facts[0]?.sourceCellId, compositionCellId);
    assert.equal(confirmedHeaderOverlays("test")["comp."], "composition");
    assert.equal(activeEngineCache("test").headerMaps[0]?.surface, "test");
    assert.equal(activeEngineCache("test").productTruth[0]?.version, 2);

    // 8. Qualities replay the mutation log. Refusals follow the active header map.
    const qualities = await handleMillQualitiesRequest(
      sessionRequest("http://localhost/api/mill/qualities", DEPOSIT_ID),
    );
    assert.equal(qualities.status, 200);
    assert.equal(qualities.surface, "test");
    if (qualities.status !== 200) return;
    assert.equal(qualities.body.length, 1);
    const quality = qualities.body[0]!;
    assert.equal(quality.id, `bq:${SUPPLIER_ORG_ID}:HX-100`);
    assert.equal(quality.depositId, DEPOSIT_ID);
    const article = quality.cells.find((cell) => cell.standardField === "article");
    const composition = quality.cells.find((cell) => cell.standardField === "composition");
    const weave = quality.cells.find((cell) => cell.header === "Weave");
    assert.equal(article?.sourceValue, "HX-100");
    assert.equal(article?.standardValue, "HX-100");
    assert.equal(composition?.sourceValue, "100% cotton");
    assert.equal(composition?.standardValue, "cotton");
    assert.equal(weave?.sourceValue, "Twill");
    assert.equal(weave?.standardField, null);
    assert.equal(weave?.standardValue, null);

    const refusals = await handleDesignRefusalsRequest(
      sessionRequest("http://localhost/api/design/refusals", DEPOSIT_ID),
    );
    assert.equal(refusals.status, 200);
    assert.equal(refusals.surface, "test");
    if (refusals.status !== 200) return;
    assert.deepEqual(
      refusals.body.unmapped_mandatory_fields,
      STANDARD_FIELDS.filter((field) => field !== "article" && field !== "composition"),
    );
    assert.deepEqual(
      refusals.body.ignored_mill_headers.map((cell) => cell.header),
      ["Weave"],
    );
    assert.equal(refusals.body.ignored_mill_headers[0]?.sourceValue, "Twill");
    assert.equal(refusals.body.ignored_mill_headers[0]?.cellId, weaveCellId);
  });
});
