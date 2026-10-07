import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { handleDesignSearchRequest } from "../design/search-http";
import { sourceCellId } from "../ingest/cell-mutations";
import { sha256Hex } from "../ingest/hash";
import { handleMillQualitiesRequest } from "../ingest/qualities-http";
import { initiateSourcingHandshake } from "../sourcing/handshake";
import { surfaceMillOrgId } from "../surfaces";
import { isFrumaVersion, type FrumaVersion } from "../versions";
import { assertWorkspaceDataDirUntouched, installDiskFreeSchemas } from "./disk-free";
import { getSpineStore, setSpineStoreForTests } from "./index";
import { ledgerSchemaName, searchPathStatement } from "./postgres-schema";
import type { Client } from "./reload-engines";

const TEST_PASS = "disk-free-lifecycle-password";
const BRAND_ORG_ID = "org_brand_secret_disk_free";
const SUPPLIER_ORG_ID = "org_mill_test";
const DEPOSIT_ID = "dep-disk-free";
const SHEET = "disk-free-mill.csv";
const ARTICLE = "DF-100";
const EMBEDDING_ID = "55555555-5555-4555-8555-555555555555";
const TARGET_FIELDS = ["price", "moq", "lead_time"];
const FILE_BYTES = Uint8Array.from([68, 105, 115, 107, 45, 102, 114, 101, 101]);
const MOCK_EMBEDDING = Array.from({ length: 1536 }, () => 0.25);

const cellPointer = { sheet: SHEET, row: 2, column: "A" } as const;
const cellId = sourceCellId(DEPOSIT_ID, cellPointer);

type MillRequestRow = {
  document_type: string;
  request_id: string;
  mill_org_id: string;
  version: number;
  payload: unknown;
};

type SchemaSession = Client & { close(): Promise<void> };

const millRequests = new Map<string, MillRequestRow[]>();

function founderRequest(path: string, version: FrumaVersion, method: "GET" | "POST", body?: string): Request {
  return new Request(path, {
    method,
    headers: {
      cookie: `${DEMO_COOKIE}=${process.env.FRUMA_DISK_FREE_COOKIE ?? ""}`,
      "content-type": "application/json",
      "x-fruma-version": version,
    },
    body,
  });
}

function readRequestRows(schemaName: string): MillRequestRow[] {
  return millRequests.get(schemaName) ?? [];
}

/** Connection pinned to one schema. Mill requests stay in that schema's map. */
function memorySession(surface: FrumaVersion): SchemaSession {
  let schemaName: string = ledgerSchemaName(surface);
  return {
    async unsafe(query: string, parameters?: readonly unknown[]) {
      if (query.includes("current_schema")) return [{ schema_name: schemaName }];
      const searchPath = query.trim().match(/^SET search_path TO (fruma_[a-z]+);$/);
      if (searchPath) {
        schemaName = searchPath[1] ?? schemaName;
        return [];
      }
      if (query.includes("FROM fruma_source_cells")) {
        const version = schemaName.slice("fruma_".length);
        if (!isFrumaVersion(version)) return [];
        const qualityId = String(parameters?.[0] ?? "");
        const snap = await getSpineStore(version).load();
        const cell = snap.sourceCells.find((row) => row.id === qualityId);
        if (!cell) return [];
        const deposit = snap.deposits.find((row) => row.depositId === cell.depositId);
        if (!deposit) return [];
        return [
          {
            id: cell.id,
            deposit_id: cell.depositId,
            sheet_name: cell.sheetName,
            row_index: cell.rowIndex,
            col_index: cell.colIndex,
            raw_header: cell.rawHeader,
            source_value: cell.sourceValue,
            supplier_org_id: deposit.supplierOrgId,
          },
        ];
      }
      if (query.includes("MAX(version)") && query.includes("fruma_mill_requests")) {
        const requestId = String(parameters?.[0] ?? "");
        const versions = readRequestRows(schemaName)
          .filter((row) => row.request_id === requestId)
          .map((row) => row.version);
        return [{ version: versions.reduce((max, version) => Math.max(max, version), 0) }];
      }
      if (query.includes("INSERT INTO fruma_mill_requests")) {
        const [documentType, requestId, millOrgId, version, payload] = parameters ?? [];
        const rows = readRequestRows(schemaName);
        rows.push({
          document_type: String(documentType),
          request_id: String(requestId),
          mill_org_id: String(millOrgId),
          version: Number(version),
          payload: typeof payload === "string" ? JSON.parse(payload) : payload,
        });
        millRequests.set(schemaName, rows);
        return [];
      }
      if (query.includes("FROM fruma_mill_requests")) {
        return [...readRequestRows(schemaName)].sort((a, b) => a.version - b.version);
      }
      throw new Error(`Unexpected disk-free lifecycle query: ${query}`);
    },
    async close() {},
  };
}

async function openSession(surface: FrumaVersion): Promise<SchemaSession> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return memorySession(surface);
  const postgres = (await import("postgres")).default;
  const schema = ledgerSchemaName(surface);
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connection: { options: `-c search_path=${schema}` },
  });
  await sql.unsafe(searchPathStatement(surface));
  return {
    unsafe(query: string, parameters?: readonly unknown[]) {
      if (parameters && parameters.length > 0) {
        return sql.unsafe(query, Array.from(parameters) as never);
      }
      return sql.unsafe(query);
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}

describe("disk-free schema lifecycle", { concurrency: 1 }, () => {
  afterEach(() => {
    millRequests.clear();
    setSpineStoreForTests(null);
    assertWorkspaceDataDirUntouched();
  });

  it("parses cells, records mutations, maps embeddings, and commits handshakes with .data empty", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    process.env.FRUMA_DISK_FREE_COOKIE = await sessionToken("owen");
    assertWorkspaceDataDirUntouched();

    millRequests.clear();
    const schemas = installDiskFreeSchemas();
    const sessions: SchemaSession[] = [];
    try {
      const testLedger = schemas.test;
      const demo = schemas.demo;
      assert.equal(testLedger, getSpineStore("test"));
      assert.equal(demo, getSpineStore("demo"));
      assert.ok(testLedger.kind === "memory" || testLedger.kind === "postgres");
      assert.ok(demo.kind === "memory" || demo.kind === "postgres");

      await demo.reset();
      await testLedger.reset();
      assertWorkspaceDataDirUntouched();

      await testLedger.saveDepositPointer(
        {
          depositId: DEPOSIT_ID,
          supplierOrgId: SUPPLIER_ORG_ID,
          filename: SHEET,
          sha256: sha256Hex(FILE_BYTES),
          byteLength: FILE_BYTES.byteLength,
          receivedAt: "2026-10-07T16:00:00.000Z",
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
          sourceValue: ARTICLE,
          normalizedValue: null,
        },
      ]);
      assertWorkspaceDataDirUntouched();

      await testLedger.appendCellMutation({
        eventId: "evt-disk-free-article",
        sourceCellId: cellId,
        operatorCookie: "founder=owen",
        actionType: "map",
        oldStandardValue: null,
        newStandardValue: ARTICLE,
        standardField: "article",
        occurredAt: "2026-10-07T16:01:00.000Z",
      });
      const recorded = await testLedger.load();
      assert.equal(recorded.sourceCells[0]?.sourceValue, ARTICLE);
      assert.equal(recorded.cellMutations.length, 1);
      assert.equal(recorded.cellMutations[0]?.newStandardValue, ARTICLE);
      assertWorkspaceDataDirUntouched();

      const qualities = await handleMillQualitiesRequest(
        founderRequest("http://localhost/api/mill/qualities", "test", "GET"),
      );
      assert.equal(qualities.status, 200);
      if (qualities.status !== 200) return;
      assert.equal(qualities.body.length, 1);
      assert.equal(qualities.body[0]?.id, `bq:${SUPPLIER_ORG_ID}:${ARTICLE}`);
      assert.equal(qualities.body[0]?.cells[0]?.sourceValue, ARTICLE);
      assert.equal(qualities.body[0]?.cells[0]?.standardValue, ARTICLE);
      assertWorkspaceDataDirUntouched();

      await testLedger.saveMaterialEmbedding({
        id: EMBEDDING_ID,
        sourceCellId: cellId,
        embedding: MOCK_EMBEDDING,
        updatedAt: "2026-10-07T16:02:00.000Z",
      });
      const matched = await handleDesignSearchRequest(
        founderRequest(
          "http://localhost/api/design/search",
          "test",
          "POST",
          JSON.stringify({ embedding: MOCK_EMBEDDING }),
        ),
      );
      assert.equal(matched.status, 200);
      if (matched.status !== 200) return;
      assert.equal(matched.body.length, 1);
      assert.equal(matched.body[0]?.cosineDistance, 0);
      assert.equal(matched.body[0]?.millArticleCode, ARTICLE);
      assertWorkspaceDataDirUntouched();

      const hidden = await handleDesignSearchRequest(
        founderRequest(
          "http://localhost/api/design/search",
          "demo",
          "POST",
          JSON.stringify({ embedding: MOCK_EMBEDDING }),
        ),
      );
      assert.equal(hidden.status, 200);
      if (hidden.status !== 200) return;
      assert.deepEqual(hidden.body, []);
      assertWorkspaceDataDirUntouched();

      const session = await openSession("test");
      sessions.push(session);
      const handshake = await initiateSourcingHandshake(session, BRAND_ORG_ID, cellId, TARGET_FIELDS);
      const rows = await session.unsafe(`
        SELECT document_type, request_id, mill_org_id, version, payload
        FROM fruma_mill_requests
        ORDER BY version ASC
      `);
      assert.equal(rows.length, 1);
      assert.equal(String(rows[0]?.request_id), handshake.request_id);
      assert.equal(String(rows[0]?.mill_org_id), surfaceMillOrgId("test"));
      const blob = typeof rows[0]?.payload === "string" ? rows[0].payload : JSON.stringify(rows[0]?.payload);
      const payload = JSON.parse(blob) as { qualityId: string; status: string; targetFields: string[] };
      assert.equal(payload.qualityId, cellId);
      assert.equal(payload.status, "PENDING");
      assert.deepEqual(payload.targetFields, TARGET_FIELDS);
      assert.equal(blob.includes(BRAND_ORG_ID), false);
      assert.equal(blob.includes("brandOrgId"), false);
      assertWorkspaceDataDirUntouched();

      const demoSession = await openSession("demo");
      sessions.push(demoSession);
      const demoRows = await demoSession.unsafe(`
        SELECT request_id FROM fruma_mill_requests
      `);
      assert.deepEqual(demoRows, []);
      assertWorkspaceDataDirUntouched();
    } finally {
      for (const session of sessions) await session.close();
      schemas.close();
      millRequests.clear();
      assertWorkspaceDataDirUntouched();
    }
  });
});
