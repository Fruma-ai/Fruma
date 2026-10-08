import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { FileSpineStore, getSpineStore, setSpineStoreForTests } from "../persist";
import type { PersistedSourceCell } from "../persist";
import { STANDARD_FIELDS } from "../ingest/types";
import { handleDesignRefusalsRequest } from "./refusals-http";

const TEST_PASS = "spec8-test-password";
const FILE_BYTES = Uint8Array.from([4, 5, 6, 7]);

async function signedCookie(): Promise<string> {
  process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
  return `${DEMO_COOKIE}=${await sessionToken("owen")}`;
}

function refusalsRequest(args: {
  cookie?: string;
  version?: string;
  depositId?: string;
}): Request {
  const url = new URL("http://localhost/api/design/refusals");
  if (args.depositId) url.searchParams.set("depositId", args.depositId);
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

function cell(partial: PersistedSourceCell): PersistedSourceCell {
  return partial;
}

async function seedLedger() {
  const store = getSpineStore("demo");
  await store.saveDepositPointer(
    {
      depositId: "dep-mill",
      supplierOrgId: "org_mill_synthetic",
      filename: "factory.csv",
      sha256: "c".repeat(64),
      byteLength: FILE_BYTES.byteLength,
      receivedAt: "2026-03-01T00:00:00.000Z",
      objectKey: "dep-mill.bin",
    },
    FILE_BYTES,
  );
  await store.saveDepositPointer(
    {
      depositId: "dep-other",
      supplierOrgId: "org_mill_synthetic",
      filename: "other.csv",
      sha256: "d".repeat(64),
      byteLength: 1,
      receivedAt: "2026-03-01T00:00:00.000Z",
      objectKey: "dep-other.bin",
    },
    Uint8Array.from([1]),
  );
  await store.saveSourceCells([
    cell({
      id: "cell-article",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 1,
      rawHeader: "Art. No",
      sourceValue: "HX-100",
      normalizedValue: null,
    }),
    cell({
      id: "cell-weight",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 2,
      rawHeader: "Weight",
      sourceValue: "5.4 oz",
      normalizedValue: "183.091034",
    }),
    cell({
      id: "cell-weave",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 3,
      rawHeader: "Weave",
      sourceValue: "Twill",
      normalizedValue: null,
    }),
    cell({
      id: "cell-weave-row3",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 3,
      colIndex: 3,
      rawHeader: "Weave",
      sourceValue: "Plain",
      normalizedValue: null,
    }),
    cell({
      id: "cell-finish",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 4,
      rawHeader: "Finish",
      sourceValue: "Peach",
      normalizedValue: null,
    }),
    cell({
      id: "cell-blank",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 5,
      rawHeader: "  ",
      sourceValue: "",
      normalizedValue: null,
    }),
    cell({
      id: "cell-colour-name",
      depositId: "dep-mill",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 6,
      rawHeader: "colour",
      sourceValue: "Navy",
      normalizedValue: null,
    }),
    cell({
      id: "cell-other",
      depositId: "dep-other",
      sheetName: "Sheet1",
      rowIndex: 2,
      colIndex: 1,
      rawHeader: "Mystery",
      sourceValue: "x",
      normalizedValue: null,
    }),
  ]);
  await store.saveHeaderMap({
    surface: "demo",
    overlays: { "art. no": "article", weave: "construction" },
    updatedAt: "2026-03-01T00:00:00.000Z",
  });
  await store.saveHeaderMap({
    surface: "demo",
    overlays: { "art. no": "article", weight: "weight" },
    updatedAt: "2026-03-02T00:00:00.000Z",
  });
  await store.saveHeaderMap({
    surface: "test",
    overlays: { weave: "construction", finish: "composition" },
    updatedAt: "2026-03-03T00:00:00.000Z",
  });
}

describe("GET /api/design/refusals", { concurrency: 1 }, () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fruma-design-refusals-"));
    setSpineStoreForTests(new FileSpineStore(dir));
  });

  afterEach(() => {
    setSpineStoreForTests(null);
  });

  it("selects the active header map and the deposit cells inside the environment schema", () => {
    const route = readFileSync(join(process.cwd(), "app/api/design/refusals/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/design/refusals-http.ts"), "utf8");
    const store = readFileSync(join(process.cwd(), "lib/fruma/persist/postgres-store.ts"), "utf8");
    assert.match(route, /export async function GET\(request: Request\)/);
    assert.match(handler, /surfaceFromRequest\(request\)/);
    assert.match(handler, /getSpineStore\(surface\)/);
    assert.match(handler, /latestActiveHeaderMap\(surface\)/);
    assert.match(handler, /listDepositSourceCells\(depositId\)/);
    assert.equal(handler.includes("getDepositBytes"), false);
    const start = store.indexOf("async latestActiveHeaderMap");
    const end = store.indexOf("async listDepositSourceCells");
    const body = store.slice(start, end);
    assert.match(body, /fruma_header_maps/);
    assert.match(body, /MAX\(version\)/);
    assert.match(body, /is_active = TRUE/);
    assert.match(body, /this\.client\(\)/);
    const cells = store.slice(end, store.indexOf("async reset()"));
    assert.match(cells, /fruma_source_cells/);
    assert.match(cells, /deposit_id/);
    assert.equal(body.includes("bytes"), false);
    assert.equal(cells.includes("bytes"), false);
  });

  it("returns 401 without a session and 400 without depositId", async () => {
    const missingCookie = await handleDesignRefusalsRequest(
      refusalsRequest({ depositId: "dep-mill" }),
    );
    assert.equal(missingCookie.status, 401);
    assert.equal(missingCookie.surface, "demo");
    const cookie = await signedCookie();
    const missingId = await handleDesignRefusalsRequest(refusalsRequest({ cookie }));
    assert.equal(missingId.status, 400);
    assert.equal(missingId.surface, "demo");
  });

  it("uses the latest active map for the requested environment and lists refused columns", async () => {
    await seedLedger();
    const cookie = await signedCookie();
    const result = await handleDesignRefusalsRequest(
      refusalsRequest({ cookie, depositId: "dep-mill" }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.surface, "demo");
    if (result.status !== 200) return;
    assert.deepEqual(result.body.unmapped_mandatory_fields, [
      "construction",
      "composition",
      "width",
      "colour",
      "moq",
      "customer",
      "cert",
    ]);
    assert.deepEqual(
      result.body.ignored_mill_headers.map((row) => row.header),
      ["Weave", "Finish", "colour"],
    );
    assert.equal(result.body.ignored_mill_headers[0]?.sourceValue, "Twill");
    assert.equal(result.body.ignored_mill_headers[0]?.column, "C");
    assert.equal(result.body.ignored_mill_headers.length, 3);
    assert.equal(JSON.stringify(result.body).includes("Mystery"), false);
    assert.equal(collectKeys(result.body).has("bytes"), false);
    assert.equal(JSON.stringify(result.body).includes("4,5,6,7"), false);
    const stored = await getSpineStore("demo").getDepositBytes("dep-mill");
    assert.deepEqual(stored, FILE_BYTES);

    const production = await handleDesignRefusalsRequest(
      refusalsRequest({ cookie, version: "production", depositId: "dep-mill" }),
    );
    assert.equal(production.surface, "production");
    if (production.status !== 200) return;
    assert.deepEqual(production.body.unmapped_mandatory_fields, [...STANDARD_FIELDS]);
    assert.equal(production.body.ignored_mill_headers.length, 5);

    const ignored = await handleDesignRefusalsRequest(
      refusalsRequest({ cookie, version: "staging", depositId: "dep-mill" }),
    );
    assert.equal(ignored.surface, "demo");
  });
});
