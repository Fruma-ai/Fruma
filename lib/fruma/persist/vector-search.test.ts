import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { handleDesignSearchRequest } from "../design/search-http";
import { sourceCellId } from "../ingest/cell-mutations";
import { sha256Hex } from "../ingest/hash";
import { assertWorkspaceDataDirUntouched, installDiskFreeSchemas } from "./disk-free";
import { setSpineStoreForTests } from "./index";
import { dropSchemaStatement, ledgerSchemaName, searchPathStatement } from "./postgres-schema";

const TEST_PASS = "vector-search-test-password";
const SUPPLIER_ORG_ID = "org_mill_test";
const DEPOSIT_ID = "dep-vector";
const SHEET = "vector-mill.csv";
const SOURCE_VALUE = "VEC-440";
const EMBEDDING_ID = "44444444-4444-4444-8444-444444444444";
const FILE_BYTES = Uint8Array.from([86, 101, 99, 116, 111, 114]);

const cellPointer = { sheet: SHEET, row: 2, column: "A" } as const;
const cellId = sourceCellId(DEPOSIT_ID, cellPointer);

/** Static 1536-d mock. Every value is the same finite float, so an identical query has cosine distance 0. */
const MOCK_EMBEDDING = Array.from({ length: 1536 }, () => 0.25);

function searchRequest(version: "test" | "demo", cookie: string): Request {
  return new Request("http://localhost/api/design/search", {
    method: "POST",
    headers: {
      cookie: `${DEMO_COOKIE}=${cookie}`,
      "content-type": "application/json",
      "x-fruma-version": version,
    },
    body: JSON.stringify({ embedding: MOCK_EMBEDDING }),
  });
}

describe("multi-modal vector search", { concurrency: 1 }, () => {
  afterEach(() => {
    setSpineStoreForTests(null);
    assertWorkspaceDataDirUntouched();
  });

  it("matches a cell inside fruma_test and returns nothing from fruma_demo", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");

    assert.equal(ledgerSchemaName("test"), "fruma_test");
    assert.equal(dropSchemaStatement("test"), "DROP SCHEMA IF EXISTS fruma_test CASCADE;");
    assert.equal(searchPathStatement("test"), "SET search_path TO fruma_test;");
    assert.equal(searchPathStatement("demo"), "SET search_path TO fruma_demo;");
    assert.equal(MOCK_EMBEDDING.length, 1536);

    const schemas = installDiskFreeSchemas();

    try {
      const testLedger = schemas.test;
      const demo = schemas.demo;

      // 1. Wipe fruma_test. Demo is cleared first so a later empty read is the isolation boundary.
      await demo.reset();
      await testLedger.reset();
      assertWorkspaceDataDirUntouched();
      const emptied = await testLedger.load();
      assert.equal(emptied.deposits.length, 0);
      assert.equal(emptied.sourceCells.length, 0);

      // 2. Deposit one source cell in fruma_test and seed its embedding.
      await testLedger.saveDepositPointer(
        {
          depositId: DEPOSIT_ID,
          supplierOrgId: SUPPLIER_ORG_ID,
          filename: SHEET,
          sha256: sha256Hex(FILE_BYTES),
          byteLength: FILE_BYTES.byteLength,
          receivedAt: "2026-10-07T14:00:00.000Z",
          objectKey: `${DEPOSIT_ID}.bin`,
        },
        FILE_BYTES,
      );
      await testLedger.saveSourceCells([
        {
          id: cellId,
          depositId: DEPOSIT_ID,
          sheetName: SHEET,
          rowIndex: cellPointer.row,
          colIndex: 1,
          rawHeader: "Art. No",
          sourceValue: SOURCE_VALUE,
          normalizedValue: null,
        },
      ]);
      await testLedger.appendCellMutation({
        eventId: "evt-vector-article",
        sourceCellId: cellId,
        operatorCookie: "secret-operator-cookie",
        actionType: "map",
        oldStandardValue: null,
        newStandardValue: "STANDARD-VEC",
        standardField: "article",
        occurredAt: "2026-10-07T14:01:00.000Z",
      });
      await testLedger.saveMaterialEmbedding({
        id: EMBEDDING_ID,
        sourceCellId: cellId,
        embedding: MOCK_EMBEDDING,
        updatedAt: "2026-10-07T14:02:00.000Z",
      });
      assertWorkspaceDataDirUntouched();

      // 3–4. The same vector on the test header resolves that cell.
      const matched = await handleDesignSearchRequest(searchRequest("test", cookie));
      assert.equal(matched.status, 200);
      assert.equal(matched.surface, "test");
      if (matched.status !== 200) return;
      assert.equal(matched.body.length, 1);
      const quality = matched.body[0];
      assert.equal(quality?.rank, 1);
      assert.equal(quality?.cosineDistance, 0);
      assert.equal(quality?.depositId, DEPOSIT_ID);
      assert.equal(quality?.millArticleCode, SOURCE_VALUE);
      const cited = quality?.cells.find(
        (cell) => cell.sheet === SHEET && cell.row === cellPointer.row && cell.column === cellPointer.column,
      );
      assert.ok(cited);
      assert.equal(cited.sourceValue, SOURCE_VALUE);
      assert.equal(cited.standardField, "article");
      assert.equal(cited.standardValue, "STANDARD-VEC");
      assert.equal(
        sourceCellId(quality.depositId, {
          sheet: cited.sheet,
          row: cited.row,
          column: cited.column,
        }),
        cellId,
      );

      // 5. The demo header reads fruma_demo. The test embedding is invisible there.
      const hidden = await handleDesignSearchRequest(searchRequest("demo", cookie));
      assert.equal(hidden.status, 200);
      assert.equal(hidden.surface, "demo");
      if (hidden.status !== 200) return;
      assert.deepEqual(hidden.body, []);
      assertWorkspaceDataDirUntouched();
    } finally {
      schemas.close();
      assertWorkspaceDataDirUntouched();
    }
  });
});
