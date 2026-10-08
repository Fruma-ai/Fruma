import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import { FileSpineStore, getSpineStore, setSpineStoreForTests } from "../persist";
import { handleMillDepositsAuditRequest } from "./deposits-http";

const TEST_PASS = "spec8-test-password";
const FIRST_BYTES = Uint8Array.from([9, 1, 2, 3]);
const SECOND_BYTES = Uint8Array.from([8, 4, 5, 6]);

async function signedCookie(): Promise<string> {
  process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
  return `${DEMO_COOKIE}=${await sessionToken("owen")}`;
}

function auditRequest(args: { cookie?: string; version?: string }): Request {
  const headers = new Headers();
  if (args.cookie) headers.set("cookie", args.cookie);
  if (args.version) headers.set("x-fruma-version", args.version);
  return new Request("http://localhost/api/mill/deposits", { method: "GET", headers });
}

async function seedLedger() {
  const store = getSpineStore("demo");
  await store.saveDepositPointer(
    {
      depositId: "dep-later",
      supplierOrgId: "org_mill_synthetic",
      filename: "later.csv",
      sha256: "b".repeat(64),
      byteLength: SECOND_BYTES.byteLength,
      receivedAt: "2026-04-02T00:00:00.000Z",
      objectKey: "dep-later.bin",
    },
    SECOND_BYTES,
  );
  await store.saveDepositPointer(
    {
      depositId: "dep-earlier",
      supplierOrgId: "org_mill_test",
      filename: "earlier.csv",
      sha256: "a".repeat(64),
      byteLength: FIRST_BYTES.byteLength,
      receivedAt: "2026-04-01T00:00:00.000Z",
      objectKey: "dep-earlier.bin",
    },
    FIRST_BYTES,
  );
}

describe("GET /api/mill/deposits", { concurrency: 1 }, () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fruma-deposit-audit-"));
    setSpineStoreForTests(new FileSpineStore(dir));
  });

  afterEach(() => {
    setSpineStoreForTests(null);
  });

  it("selects tracking columns on the active search path and leaves the bytes column out", () => {
    const route = readFileSync(join(process.cwd(), "app/api/mill/deposits/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/ingest/deposits-http.ts"), "utf8");
    const store = readFileSync(join(process.cwd(), "lib/fruma/persist/postgres-store.ts"), "utf8");
    assert.match(route, /export async function GET\(request: Request\)/);
    assert.match(handler, /surfaceFromRequest\(request\)/);
    assert.match(handler, /getSpineStore\(surface\)/);
    assert.match(handler, /listDepositAudit\(\)/);
    const start = store.indexOf("async listDepositAudit()");
    const end = store.indexOf("async reset()");
    const body = store.slice(start, end);
    assert.match(body, /this\.client\(\)/);
    assert.match(body, /SELECT id, filename, byte_hash, supplier_org_id, received_at/);
    assert.match(body, /fruma_deposits/);
    assert.equal(/\bbytes\b/.test(body), false);
  });

  it("returns 401 without a mill session and defaults the version header to demo", async () => {
    const missing = await handleMillDepositsAuditRequest(auditRequest({}));
    assert.equal(missing.status, 401);
    assert.equal(missing.surface, "demo");
    const cookie = await signedCookie();
    const demo = await handleMillDepositsAuditRequest(auditRequest({ cookie }));
    assert.equal(demo.status, 200);
    assert.equal(demo.surface, "demo");
    const production = await handleMillDepositsAuditRequest(
      auditRequest({ cookie, version: "production" }),
    );
    assert.equal(production.surface, "production");
  });

  it("returns the deposit audit trail without file payloads", async () => {
    await seedLedger();
    const cookie = await signedCookie();
    const result = await handleMillDepositsAuditRequest(auditRequest({ cookie }));
    assert.equal(result.status, 200);
    if (result.status !== 200) return;
    assert.deepEqual(result.body, [
      {
        id: "dep-earlier",
        filename: "earlier.csv",
        byte_hash: "a".repeat(64),
        supplier_org_id: "org_mill_test",
        received_at: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "dep-later",
        filename: "later.csv",
        byte_hash: "b".repeat(64),
        supplier_org_id: "org_mill_synthetic",
        received_at: "2026-04-02T00:00:00.000Z",
      },
    ]);
    for (const row of result.body) {
      assert.deepEqual(Object.keys(row), [
        "id",
        "filename",
        "byte_hash",
        "supplier_org_id",
        "received_at",
      ]);
    }
    const encoded = JSON.stringify(result.body);
    assert.equal(encoded.includes("9,1,2,3"), false);
    assert.equal(encoded.includes("8,4,5,6"), false);
    const stored = await getSpineStore("demo").getDepositBytes("dep-earlier");
    assert.deepEqual(stored, FIRST_BYTES);
  });
});
