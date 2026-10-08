import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { FileSpineStore, getSpineStore, setSpineStoreForTests } from "../persist";
import type { PersistedCellMutation, PersistedSourceCell } from "../persist";
import { handleMillQualitiesRequest } from "./qualities-http";

const TEST_PASS = "spec8-test-password";
const FILE_BYTES = Uint8Array.from([9, 8, 7, 6]);

function cell(partial: PersistedSourceCell): PersistedSourceCell {
  return partial;
}

function mutation(partial: PersistedCellMutation): PersistedCellMutation {
  return partial;
}

async function signedCookie(): Promise<string> {
  process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
  return `${DEMO_COOKIE}=${await sessionToken("owen")}`;
}

function qualitiesRequest(args: {
  cookie?: string;
  version?: string;
  depositId?: string;
  quality?: string;
}): Request {
  const url = new URL("http://localhost/api/mill/qualities");
  if (args.depositId) url.searchParams.set("depositId", args.depositId);
  if (args.quality) url.searchParams.set("quality", args.quality);
  const headers = new Headers();
  if (args.cookie) headers.set("cookie", args.cookie);
  if (args.version) headers.set("x-fruma-version", args.version);
  return new Request(url, { method: "GET", headers });
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

async function seedLedger() {
  const store = getSpineStore("demo");
  await store.saveDepositPointer(
    {
      depositId: "dep-hx",
      supplierOrgId: "org_mill_synthetic",
      filename: "hanger.csv",
      sha256: "a".repeat(64),
      byteLength: FILE_BYTES.byteLength,
      receivedAt: "2026-01-01T00:00:00.000Z",
      objectKey: "dep-hx.bin",
    },
    FILE_BYTES,
  );
  await store.saveDepositPointer(
    {
      depositId: "dep-other",
      supplierOrgId: "org_mill_synthetic",
      filename: "other.csv",
      sha256: "b".repeat(64),
      byteLength: 1,
      receivedAt: "2026-01-01T00:00:00.000Z",
      objectKey: "dep-other.bin",
    },
    Uint8Array.from([1]),
  );

  const hx: PersistedSourceCell[] = [
    cell({
      id: "cell-article",
      depositId: "dep-hx",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 1,
      rawHeader: "Art. No",
      sourceValue: "HX-100",
      normalizedValue: null,
    }),
    cell({
      id: "cell-weight",
      depositId: "dep-hx",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 2,
      rawHeader: "Weight",
      sourceValue: "5.4 oz",
      normalizedValue: "183.091034",
    }),
    cell({
      id: "cell-colour",
      depositId: "dep-hx",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 3,
      rawHeader: "Colour",
      sourceValue: "Navy",
      normalizedValue: null,
    }),
  ];
  await store.saveSourceCells(hx);
  await store.saveSourceCells([
    cell({
      id: "cell-other",
      depositId: "dep-other",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 1,
      rawHeader: "Art. No",
      sourceValue: "OTHER",
      normalizedValue: null,
    }),
  ]);

  const events: PersistedCellMutation[] = [
    mutation({
      eventId: "evt-weight-late",
      sourceCellId: "cell-weight",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: "5.4 oz",
      newStandardValue: "183",
      standardField: "weight",
      occurredAt: "2026-02-02T00:00:00.000Z",
    }),
    mutation({
      eventId: "evt-weight-early",
      sourceCellId: "cell-weight",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "5.4 oz",
      standardField: "weight",
      occurredAt: "2026-02-01T00:00:00.000Z",
    }),
    mutation({
      eventId: "evt-article",
      sourceCellId: "cell-article",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "HX-100",
      standardField: "article",
      occurredAt: "2026-02-01T00:00:00.000Z",
    }),
    mutation({
      eventId: "evt-article-confirm",
      sourceCellId: "cell-article",
      operatorCookie: "secret-operator-cookie",
      actionType: "confirm",
      oldStandardValue: "HX-100",
      newStandardValue: "HX-100",
      standardField: null,
      occurredAt: "2026-02-03T00:00:00.000Z",
    }),
    mutation({
      eventId: "evt-colour",
      sourceCellId: "cell-colour",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "Navy",
      standardField: "colour",
      occurredAt: "2026-02-01T00:00:00.000Z",
    }),
    mutation({
      eventId: "evt-other",
      sourceCellId: "cell-other",
      operatorCookie: "secret-operator-cookie",
      actionType: "map",
      oldStandardValue: null,
      newStandardValue: "OTHER",
      standardField: "article",
      occurredAt: "2026-02-01T00:00:00.000Z",
    }),
  ];
  for (const event of events) await store.appendCellMutation(event);
}

describe("GET /api/mill/qualities", { concurrency: 1 }, () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fruma-mill-qualities-"));
    setSpineStoreForTests(new FileSpineStore(dir));
  });

  afterEach(() => {
    setSpineStoreForTests(null);
  });

  it("reads x-fruma-version, left-joins mutations, and leaves file bytes out of the route", () => {
    const route = readFileSync(join(process.cwd(), "app/api/mill/qualities/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/ingest/qualities-http.ts"), "utf8");
    const store = readFileSync(join(process.cwd(), "lib/fruma/persist/postgres-store.ts"), "utf8");
    assert.match(route, /export async function GET\(request: Request\)/);
    assert.match(handler, /surfaceFromRequest\(request\)/);
    assert.match(handler, /getSpineStore\(surface\)/);
    assert.match(handler, /listSourceCellsWithMutations/);
    assert.equal(handler.includes("getDepositBytes"), false);
    const start = store.indexOf("async listSourceCellsWithMutations");
    const end = store.indexOf("async reset()");
    const body = store.slice(start, end);
    assert.match(body, /fruma_source_cells/);
    assert.match(body, /LEFT JOIN/);
    assert.match(body, /fruma_cell_mutation_events/);
    assert.match(body, /ORDER BY e\.occurred_at ASC/);
    assert.equal(body.includes("bytes"), false);
  });

  it("returns 401 without a mill session cookie", async () => {
    const result = await handleMillQualitiesRequest(qualitiesRequest({}));
    assert.equal(result.status, 401);
    assert.equal(result.surface, "demo");
  });

  it("defaults a missing version header to demo and accepts production", async () => {
    const cookie = await signedCookie();
    const missing = await handleMillQualitiesRequest(qualitiesRequest({ cookie }));
    assert.equal(missing.status, 200);
    assert.equal(missing.surface, "demo");
    const production = await handleMillQualitiesRequest(
      qualitiesRequest({ cookie, version: "production" }),
    );
    assert.equal(production.surface, "production");
    const ignored = await handleMillQualitiesRequest(
      qualitiesRequest({ cookie, version: "staging" }),
    );
    assert.equal(ignored.surface, "demo");
  });

  it("replays mutations onto source values and omits raw file bytes", async () => {
    await seedLedger();
    const cookie = await signedCookie();
    const result = await handleMillQualitiesRequest(qualitiesRequest({ cookie, quality: "HX-100" }));
    assert.equal(result.status, 200);
    if (result.status !== 200) return;
    assert.equal(result.body.length, 1);
    const quality = result.body[0]!;
    assert.equal(quality.id, "bq:org_mill_synthetic:HX-100");
    assert.equal(quality.millArticleCode, "HX-100");
    assert.equal(quality.depositId, "dep-hx");
    const weight = quality.cells.find((row) => row.standardField === "weight");
    assert.ok(weight);
    assert.equal(weight.sourceValue, "5.4 oz");
    assert.equal(weight.standardValue, "183");
    assert.equal(weight.normalizedValue, "183.091034");
    const article = quality.cells.find((row) => row.standardField === "article");
    assert.equal(article?.sourceValue, "HX-100");
    assert.equal(article?.standardValue, "HX-100");
    assert.equal(article?.confirmed, true);
    assert.equal(article?.column, "A");
    assert.deepEqual(quality.colourways, [
      { id: "cw:bq:org_mill_synthetic:HX-100:Navy", colourAsWritten: "Navy" },
    ]);

    const encoded = JSON.stringify(result.body);
    assert.equal(encoded.includes("secret-operator-cookie"), false);
    assert.equal(encoded.includes("9,8,7,6"), false);
    assert.equal(collectKeys(result.body).has("bytes"), false);

    const stored = await getSpineStore("demo").getDepositBytes("dep-hx");
    assert.deepEqual(stored, FILE_BYTES);

    const byDeposit = await handleMillQualitiesRequest(
      qualitiesRequest({ cookie, depositId: "dep-other" }),
    );
    assert.equal(byDeposit.status, 200);
    if (byDeposit.status !== 200) return;
    assert.deepEqual(
      byDeposit.body.map((row) => row.millArticleCode),
      ["OTHER"],
    );

    const listed = await handleMillQualitiesRequest(qualitiesRequest({ cookie }));
    assert.equal(listed.status, 200);
    if (listed.status !== 200) return;
    assert.deepEqual(
      listed.body.map((row) => row.millArticleCode),
      ["HX-100", "OTHER"],
    );
  });
});
