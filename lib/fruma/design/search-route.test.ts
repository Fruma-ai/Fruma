import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { FileSpineStore, getSpineStore, setSpineStoreForTests } from "../persist";
import type { PersistedCellMutation, PersistedSourceCell } from "../persist";
import { cosineDistance } from "../persist/embeddings";
import { handleDesignSearchRequest } from "./search-http";

const TEST_PASS = "spec8-test-password";
const FILE_BYTES = Uint8Array.from([9, 8, 7, 6]);
const DIMS = 1536;

async function signedCookie(): Promise<string> {
  process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
  return `${DEMO_COOKIE}=${await sessionToken("owen")}`;
}

function searchRequest(args: {
  cookie?: string;
  version?: string;
  body?: unknown;
  rawBody?: string;
}): Request {
  const headers = new Headers();
  if (args.cookie) headers.set("cookie", args.cookie);
  if (args.version) headers.set("x-fruma-version", args.version);
  if (args.body !== undefined || args.rawBody !== undefined) {
    headers.set("content-type", "application/json");
  }
  return new Request("http://localhost/api/design/search", {
    method: "POST",
    headers,
    body: args.rawBody ?? (args.body === undefined ? undefined : JSON.stringify(args.body)),
  });
}

function collectKeys(value: unknown, acc = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return acc;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, acc);
    return acc;
  }
  for (const [key, child] of Object.entries(value)) {
    acc.add(key);
    collectKeys(child, acc);
  }
  return acc;
}

function axis(index: number): number[] {
  const values = Array.from({ length: DIMS }, () => 0);
  values[index] = 1;
  return values;
}

function embeddingId(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function cell(partial: PersistedSourceCell): PersistedSourceCell {
  return partial;
}

function mutation(partial: PersistedCellMutation): PersistedCellMutation {
  return partial;
}

async function seedCatalog() {
  const store = getSpineStore("demo");
  await store.saveDepositPointer(
    {
      depositId: "dep-mill",
      supplierOrgId: "org_mill_synthetic",
      filename: "factory.csv",
      sha256: "e".repeat(64),
      byteLength: FILE_BYTES.byteLength,
      receivedAt: "2026-05-01T00:00:00.000Z",
      objectKey: "dep-mill.bin",
    },
    FILE_BYTES,
  );
  await store.saveSourceCells([
    cell({
      id: "cell-near",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 1,
      rawHeader: "Art. No",
      sourceValue: "HX-100",
      normalizedValue: null,
    }),
    cell({
      id: "cell-weave",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 2,
      rawHeader: "Weave",
      sourceValue: "Twill",
      normalizedValue: null,
    }),
    cell({
      id: "cell-far",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 3,
      colIndex: 1,
      rawHeader: "Art. No",
      sourceValue: "HX-900",
      normalizedValue: null,
    }),
    cell({
      id: "cell-decoy",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 4,
      colIndex: 1,
      rawHeader: "Internal note",
      sourceValue: "do not rank",
      normalizedValue: null,
    }),
  ]);
  await store.appendCellMutation(
    mutation({
      eventId: "evt-near",
      sourceCellId: "cell-near",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "STANDARD-HX",
      standardField: "article",
      occurredAt: "2026-05-02T00:00:00.000Z",
    }),
  );
  await store.appendCellMutation(
    mutation({
      eventId: "evt-far",
      sourceCellId: "cell-far",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "STANDARD-FAR",
      standardField: "article",
      occurredAt: "2026-05-02T00:00:00.000Z",
    }),
  );
  await store.saveMaterialEmbedding({
    id: embeddingId(1),
    sourceCellId: "cell-near",
    embedding: axis(0),
    updatedAt: "2026-05-03T00:00:00.000Z",
  });
  await store.saveMaterialEmbedding({
    id: embeddingId(2),
    sourceCellId: "cell-far",
    embedding: axis(1),
    updatedAt: "2026-05-03T00:00:00.000Z",
  });
  await store.saveMaterialEmbedding({
    id: embeddingId(3),
    sourceCellId: "cell-decoy",
    embedding: axis(0),
    updatedAt: "2026-05-03T00:00:00.000Z",
  });
}

describe("POST /api/design/search", { concurrency: 1 }, () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fruma-design-search-"));
    setSpineStoreForTests(new FileSpineStore(dir));
  });

  afterEach(() => {
    setSpineStoreForTests(null);
  });

  it("measures cosine distance the same way pgvector <=> does", () => {
    assert.equal(cosineDistance(axis(0), axis(0)), 0);
    assert.equal(cosineDistance(axis(0), axis(1)), 1);
    assert.equal(cosineDistance(axis(0), axis(0).map((value) => -value)), 2);
    assert.equal(cosineDistance(Array.from({ length: DIMS }, () => 0), axis(0)), 1);
  });

  it("joins embeddings to source cells and replays mutation events in the schema query", () => {
    const route = readFileSync(join(process.cwd(), "app/api/design/search/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/design/search-http.ts"), "utf8");
    const store = readFileSync(join(process.cwd(), "lib/fruma/persist/postgres-store.ts"), "utf8");
    assert.match(route, /export async function POST\(request: Request\)/);
    assert.match(handler, /surfaceFromRequest\(request\)/);
    assert.match(handler, /requireTestFounder\(request\)/);
    assert.match(handler, /getSpineStore\(surface\)/);
    assert.match(handler, /searchMaterialEmbeddings\(embedding\)/);
    assert.match(handler, /search_path/);
    assert.equal(handler.includes("getDepositBytes"), false);
    const start = store.indexOf("async searchMaterialEmbeddings");
    const end = store.indexOf("async reset()");
    const body = store.slice(start, end);
    assert.match(body, /<=>/);
    assert.match(body, /fruma_material_embeddings/);
    assert.match(body, /INNER JOIN/);
    assert.match(body, /fruma_source_cells/);
    assert.match(body, /LEFT JOIN/);
    assert.match(body, /fruma_cell_mutation_events/);
    assert.match(body, /public\.vector/);
    assert.match(body, /LIMIT 50/);
    assert.equal(body.includes("bytes"), false);
  });

  it("returns 401 without a founder cookie and 400 for a bad embedding", async () => {
    const missing = await handleDesignSearchRequest(searchRequest({ body: { embedding: axis(0) } }));
    assert.equal(missing.status, 401);
    assert.equal(missing.surface, "demo");

    const cookie = await signedCookie();
    const junk = await handleDesignSearchRequest(searchRequest({ cookie, rawBody: "not-json" }));
    assert.equal(junk.status, 400);
    assert.equal(junk.surface, "demo");
    const short = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: [0.1, 0.2] } }),
    );
    assert.equal(short.status, 400);
    const infinite = axis(0);
    infinite[0] = Number.POSITIVE_INFINITY;
    const nonFinite = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: infinite } }),
    );
    assert.equal(nonFinite.status, 400);
  });

  it("defaults a missing version header to demo and accepts test", async () => {
    const cookie = await signedCookie();
    const missing = await handleDesignSearchRequest(searchRequest({ cookie, body: { embedding: axis(0) } }));
    assert.equal(missing.status, 200);
    assert.equal(missing.surface, "demo");
    if (missing.status === 200) assert.deepEqual(missing.body, []);
    const testSurface = await handleDesignSearchRequest(
      searchRequest({ cookie, version: "test", body: { embedding: axis(0) } }),
    );
    assert.equal(testSurface.status, 200);
    assert.equal(testSurface.surface, "test");
  });

  it("ranks the closest replayed qualities and leaves file bytes out", async () => {
    await seedCatalog();
    const cookie = await signedCookie();
    const result = await handleDesignSearchRequest(
      searchRequest({ cookie, version: "test", body: { embedding: axis(0) } }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.surface, "test");
    if (result.status !== 200) return;
    assert.equal(result.body.length, 2);
    assert.equal(collectKeys(result.body).has("bytes"), false);

    const [near, far] = result.body;
    assert.equal(near?.rank, 1);
    assert.equal(near?.cosineDistance, 0);
    assert.equal(near?.millArticleCode, "HX-100");
    assert.equal(near?.id, "bq:org_mill_synthetic:HX-100");
    const nearArticle = near?.cells.find((row) => row.header === "Art. No");
    assert.equal(nearArticle?.sourceValue, "HX-100");
    assert.equal(nearArticle?.standardField, "article");
    assert.equal(nearArticle?.standardValue, "STANDARD-HX");
    const weave = near?.cells.find((row) => row.header === "Weave");
    assert.equal(weave?.sourceValue, "Twill");
    assert.equal(weave?.column, "B");
    assert.equal(weave?.standardField, null);
    assert.equal(weave?.standardValue, null);

    assert.equal(far?.rank, 2);
    assert.equal(far?.cosineDistance, 1);
    assert.equal(far?.millArticleCode, "HX-900");
    const farArticle = far?.cells.find((row) => row.header === "Art. No");
    assert.equal(farArticle?.sourceValue, "HX-900");
    assert.equal(farArticle?.standardValue, "STANDARD-FAR");
    assert.equal(
      result.body.some((row) => row.cells.some((cell) => cell.sourceValue === "do not rank")),
      false,
    );
  });

  it("returns at most the ten closest qualities", async () => {
    const store = getSpineStore("demo");
    await store.saveDepositPointer(
      {
        depositId: "dep-many",
        supplierOrgId: "org_mill_synthetic",
        filename: "many.csv",
        sha256: "f".repeat(64),
        byteLength: 1,
        receivedAt: "2026-05-04T00:00:00.000Z",
        objectKey: "dep-many.bin",
      },
      Uint8Array.from([1]),
    );
    const cells: PersistedSourceCell[] = [];
    for (let index = 0; index < 12; index += 1) {
      const code = `Q${index.toString().padStart(2, "0")}`;
      cells.push(
        cell({
          id: `cell-q-${code}`,
          depositId: "dep-many",
          sheetName: "Sheet1",
          rowIndex: index + 2,
          colIndex: 1,
          rawHeader: "Art. No",
          sourceValue: code,
          normalizedValue: null,
        }),
      );
    }
    await store.saveSourceCells(cells);
    for (let index = 0; index < cells.length; index += 1) {
      const row = cells[index]!;
      await store.appendCellMutation(
        mutation({
          eventId: `evt-q-${row.id}`,
          sourceCellId: row.id,
          operatorCookie: "secret-operator-cookie",
          actionType: "map",
          oldStandardValue: null,
          newStandardValue: `STD-${row.sourceValue}`,
          standardField: "article",
          occurredAt: "2026-05-04T01:00:00.000Z",
        }),
      );
      await store.saveMaterialEmbedding({
        id: embeddingId(20 + index),
        sourceCellId: row.id,
        embedding: axis(index),
        updatedAt: "2026-05-04T02:00:00.000Z",
      });
    }

    const cookie = await signedCookie();
    const result = await handleDesignSearchRequest(
      searchRequest({ cookie, body: { embedding: axis(0) } }),
    );
    assert.equal(result.status, 200);
    if (result.status !== 200) return;
    assert.equal(result.body.length, 10);
    assert.deepEqual(
      result.body.map((row) => row.millArticleCode),
      ["Q00", "Q01", "Q02", "Q03", "Q04", "Q05", "Q06", "Q07", "Q08", "Q09"],
    );
    assert.deepEqual(
      result.body.map((row) => row.rank),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    assert.equal(result.body[0]?.cosineDistance, 0);
    assert.equal(result.body[1]?.cosineDistance, 1);
    assert.equal(result.body[0]?.cells[0]?.sourceValue, "Q00");
    assert.equal(result.body[0]?.cells[0]?.standardValue, "STD-Q00");
  });
});
