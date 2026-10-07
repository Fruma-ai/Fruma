import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { sourceCellId } from "../ingest/cell-mutations";
import { sha256Hex } from "../ingest/hash";
import { handleMillQualitiesRequest } from "../ingest/qualities-http";
import { getSpineStore, setSpineStoreForTests } from "../persist";
import { assertWorkspaceDataDirUntouched, installDiskFreeSchemas } from "../persist/disk-free";
import type { Client } from "../persist/reload-engines";
import { ledgerSchemaName, searchPathStatement } from "../persist/postgres-schema";
import { surfaceFromRequest, surfaceMillOrgId } from "../surfaces";
import { isFrumaVersion, type FrumaVersion } from "../versions";
import { initiateSourcingHandshake } from "./handshake";

const TEST_PASS = "handshake-lifecycle-password";
const BRAND_ORG_ID = "org_brand_secret_handshake";
const DEPOSIT_ID = "dep-handshake";
const SHEET = "handshake-mill.csv";
const ARTICLE = "HX-100";
const TARGET_FIELDS = ["price", "moq", "lead_time"];
const FILE_BYTES = Uint8Array.from([72, 97, 110, 100, 115, 104, 97, 107, 101]);

const cellPointer = { sheet: SHEET, row: 2, column: "A" } as const;
const cellId = sourceCellId(DEPOSIT_ID, cellPointer);

type MillRequestRow = {
  document_type: string;
  request_id: string;
  mill_org_id: string;
  version: number;
  payload: unknown;
};

type HandshakeSession = Client & { close(): Promise<void> };

function headerRequest(version: FrumaVersion): Request {
  return new Request("http://localhost/api/mill/qualities", {
    method: "GET",
    headers: {
      cookie: `${DEMO_COOKIE}=${process.env.FRUMA_HANDSHAKE_COOKIE ?? ""}`,
      "x-fruma-version": version,
    },
  });
}

/** Mill-request rows for one schema. Reset clears the map with the schema store. */
const millRequests = new Map<string, MillRequestRow[]>();

function readRequestRows(schemaName: string): MillRequestRow[] {
  return millRequests.get(schemaName) ?? [];
}

function writeRequestRows(schemaName: string, rows: MillRequestRow[]): void {
  millRequests.set(schemaName, rows.map((row) => ({ ...row })));
}

/**
 * In-memory stand-in for a pooled connection whose search_path is one ledger schema.
 * Cells come from that schema's store. Mill requests stay in the schema map.
 */
function memorySession(surface: FrumaVersion): HandshakeSession {
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
        writeRequestRows(schemaName, rows);
        return [];
      }
      if (query.includes("FROM fruma_mill_requests")) {
        return readRequestRows(schemaName).sort((a, b) => a.version - b.version);
      }
      throw new Error(`Unexpected handshake lifecycle query: ${query}`);
    },
    async close() {},
  };
}

async function openSession(surface: FrumaVersion): Promise<HandshakeSession> {
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

async function seedQuality(surface: FrumaVersion): Promise<void> {
  const store = getSpineStore(surface);
  const supplierOrgId = surfaceMillOrgId(surface);
  await store.saveDepositPointer(
    {
      depositId: DEPOSIT_ID,
      supplierOrgId,
      filename: SHEET,
      sha256: sha256Hex(FILE_BYTES),
      byteLength: FILE_BYTES.byteLength,
      receivedAt: "2026-10-07T15:00:00.000Z",
      objectKey: `${DEPOSIT_ID}.bin`,
    },
    FILE_BYTES,
  );
  await store.saveSourceCells([
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
  await store.appendCellMutation({
    eventId: `evt-handshake-article-${surface}`,
    sourceCellId: cellId,
    operatorCookie: "secret-operator-cookie",
    actionType: "map",
    oldStandardValue: null,
    newStandardValue: ARTICLE,
    standardField: "article",
    occurredAt: "2026-10-07T15:01:00.000Z",
  });
}

async function readMillRequests(client: Client): Promise<MillRequestRow[]> {
  const rows = await client.unsafe(`
    SELECT document_type, request_id, mill_org_id, version, payload
    FROM fruma_mill_requests
    ORDER BY version ASC
  `);
  return rows.map((row) => ({
    document_type: String(row.document_type),
    request_id: String(row.request_id),
    mill_org_id: String(row.mill_org_id),
    version: Number(row.version),
    payload: row.payload,
  }));
}

function payloadBlob(payload: unknown): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

function assertAnonymousPayload(row: MillRequestRow, millOrgId: string): void {
  assert.equal(row.document_type, "mill_request");
  assert.equal(row.version, 1);
  assert.equal(row.mill_org_id, millOrgId);
  assert.equal(row.mill_org_id === BRAND_ORG_ID, false);

  const blob = payloadBlob(row.payload);
  const payload = JSON.parse(blob) as {
    qualityId: string;
    targetFields: string[];
    status: string;
  };
  assert.equal(payload.qualityId, cellId);
  assert.deepEqual(payload.targetFields, TARGET_FIELDS);
  assert.equal(payload.status, "PENDING");
  assert.equal(blob.includes(BRAND_ORG_ID), false);
  assert.equal(blob.includes("brandOrgId"), false);
  assert.equal(blob.includes("brand_org_id"), false);
  assert.equal(blob.includes("brandId"), false);
  assert.equal(blob.includes("brandName"), false);
}

describe("anonymous sourcing handshake lifecycle", { concurrency: 1 }, () => {
  afterEach(() => {
    millRequests.clear();
    setSpineStoreForTests(null);
    assertWorkspaceDataDirUntouched();
  });

  it("writes a pending anonymous request into the schema named by the version header", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    process.env.FRUMA_HANDSHAKE_COOKIE = await sessionToken("owen");

    assert.equal(ledgerSchemaName("test"), "fruma_test");
    assert.equal(searchPathStatement("test"), "SET search_path TO fruma_test;");
    assert.equal(searchPathStatement("demo"), "SET search_path TO fruma_demo;");

    millRequests.clear();
    const schemas = installDiskFreeSchemas();

    const sessions: HandshakeSession[] = [];
    try {
      const testLedger = schemas.test;
      const demo = schemas.demo;

      // 1. Clean fruma_test. Demo is cleared so a later empty read is the other schema.
      await demo.reset();
      await testLedger.reset();
      assertWorkspaceDataDirUntouched();
      const emptied = await testLedger.load();
      assert.equal(emptied.deposits.length, 0);
      assert.equal(emptied.sourceCells.length, 0);
      assert.equal(emptied.requests.length, 0);

      // 2. The same cell and article quality exist independently in each schema.
      await seedQuality("test");
      await seedQuality("demo");

      const testQualities = await handleMillQualitiesRequest(headerRequest("test"));
      const demoQualities = await handleMillQualitiesRequest(headerRequest("demo"));
      assert.equal(testQualities.status, 200);
      assert.equal(demoQualities.status, 200);
      assert.equal(testQualities.surface, "test");
      assert.equal(demoQualities.surface, "demo");
      if (testQualities.status !== 200 || demoQualities.status !== 200) return;
      assert.equal(testQualities.body[0]?.id, `bq:${surfaceMillOrgId("test")}:${ARTICLE}`);
      assert.equal(demoQualities.body[0]?.id, `bq:${surfaceMillOrgId("demo")}:${ARTICLE}`);
      assert.equal(testQualities.body.length, 1);
      assert.equal(demoQualities.body.length, 1);
      assertWorkspaceDataDirUntouched();

      const testSurface = surfaceFromRequest(headerRequest("test"));
      const demoSurface = surfaceFromRequest(headerRequest("demo"));
      assert.equal(testSurface, "test");
      assert.equal(demoSurface, "demo");
      const testSession = await openSession(testSurface);
      const demoSession = await openSession(demoSurface);
      sessions.push(testSession, demoSession);

      // 3–5. The test connection inserts one pending row. The brand is not in the payload.
      const testHandshake = await initiateSourcingHandshake(
        testSession,
        BRAND_ORG_ID,
        cellId,
        TARGET_FIELDS,
      );
      const testRows = await readMillRequests(testSession);
      assert.equal(testRows.length, 1);
      assert.equal(testRows[0]?.request_id, testHandshake.request_id);
      assertAnonymousPayload(testRows[0], surfaceMillOrgId("test"));
      const testPayload = JSON.parse(payloadBlob(testRows[0].payload)) as { implementedAt: string };
      assert.equal(testPayload.implementedAt, testHandshake.implementedAt);
      assertWorkspaceDataDirUntouched();

      const demoBefore = await readMillRequests(demoSession);
      assert.deepEqual(demoBefore, []);

      // 6. The same ask on the demo header writes only into fruma_demo.
      const demoHandshake = await initiateSourcingHandshake(
        demoSession,
        BRAND_ORG_ID,
        cellId,
        TARGET_FIELDS,
      );
      const demoRows = await readMillRequests(demoSession);
      const testRowsAfter = await readMillRequests(testSession);
      assert.equal(demoRows.length, 1);
      assert.equal(demoRows[0]?.request_id, demoHandshake.request_id);
      assert.notEqual(demoHandshake.request_id, testHandshake.request_id);
      assertAnonymousPayload(demoRows[0], surfaceMillOrgId("demo"));
      assert.equal(testRowsAfter.length, 1);
      assert.equal(testRowsAfter[0]?.request_id, testHandshake.request_id);
      assert.equal(testRowsAfter[0]?.mill_org_id, surfaceMillOrgId("test"));
      assert.equal(
        testRowsAfter.some((row) => row.mill_org_id === surfaceMillOrgId("demo")),
        false,
      );
      assert.equal(
        demoRows.some((row) => row.mill_org_id === surfaceMillOrgId("test")),
        false,
      );
      assertWorkspaceDataDirUntouched();
    } finally {
      for (const session of sessions) await session.close();
      schemas.close();
      millRequests.clear();
      assertWorkspaceDataDirUntouched();
    }
  });
});
