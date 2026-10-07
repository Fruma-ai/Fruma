import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import type { Client } from "../persist/reload-engines";
import { setPostgresPoolForTests, type PostgresPool } from "../persist/postgres-store";
import { handleSourcingHandshakeRequest } from "./handshake-http";

const BRAND = "org_brand_secret_handshake";
const QUALITY_ID = "cell:dep-mill:2:A:Sheet1";
const TEST_PASS = "handshake-route-password";

const CELL = {
  id: QUALITY_ID,
  deposit_id: "dep-mill",
  sheet_name: "Sheet1",
  row_index: 2,
  col_index: 1,
  raw_header: "Art. No",
  source_value: "HX-100",
  supplier_org_id: "org_mill_test",
};

type Call = { query: string; parameters?: readonly unknown[] };

function ledgerPool(options: { schema: string; cell?: Record<string, unknown> | null }): PostgresPool & {
  calls: Call[];
  connects: number;
  releases: number;
} {
  const calls: Call[] = [];
  const state = { connects: 0, releases: 0 };
  const pool: PostgresPool & { calls: Call[]; connects: number; releases: number } = {
    calls,
    get connects() {
      return state.connects;
    },
    get releases() {
      return state.releases;
    },
    async connect() {
      state.connects += 1;
      const client: Client & { release(): void } = {
        async unsafe(query: string, parameters?: readonly unknown[]) {
          calls.push({ query, parameters });
          if (query.includes("current_schema")) return [{ schema_name: options.schema }];
          if (query.trim().startsWith("SET search_path")) return [];
          if (query.includes("FROM fruma_source_cells")) return options.cell ? [options.cell] : [];
          if (query.includes("MAX(version)")) return [{ version: 0 }];
          if (query.includes("INSERT INTO fruma_mill_requests")) return [];
          throw new Error(`Unexpected handshake query: ${query}`);
        },
        release() {
          state.releases += 1;
        },
      };
      return client;
    },
  };
  return pool;
}

function postHandshake(
  version: string | null,
  body: unknown,
  cookie?: string,
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (version) headers.set("x-fruma-version", version);
  if (cookie) headers.set("cookie", `${DEMO_COOKIE}=${cookie}`);
  return new Request("http://localhost/api/sourcing/handshake", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/sourcing/handshake", { concurrency: 1 }, () => {
  afterEach(() => {
    for (const version of ["demo", "test", "production"] as const) {
      setPostgresPoolForTests(version, null);
    }
  });

  it("delegates the route to the schema-pinned handshake handler", () => {
    const route = readFileSync(join(process.cwd(), "app/api/sourcing/handshake/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/sourcing/handshake-http.ts"), "utf8");
    assert.match(route, /export async function POST\(request: Request\)/);
    assert.match(route, /handleSourcingHandshakeRequest/);
    assert.match(handler, /requireTestFounder\(request\)/);
    assert.match(handler, /getPostgresPool\(version\)/);
    assert.match(handler, /initiateSourcingHandshake\(/);
    assert.equal(handler.includes(BRAND), false);
    assert.equal(route.includes("brandOrgId"), false);
  });

  it("returns 401 when the founder session cookie is missing or invalid", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const missing = await handleSourcingHandshakeRequest(
      postHandshake("test", { qualityId: QUALITY_ID, targetFields: ["moq"], brandOrgId: BRAND }),
    );
    assert.equal(missing.status, 401);
    assert.equal(missing.surface, "test");
    assert.deepEqual(missing.body, { error: "unauthorized_operator" });

    const invalid = await handleSourcingHandshakeRequest(
      postHandshake("demo", { qualityId: QUALITY_ID, targetFields: ["moq"], brandOrgId: BRAND }, "owen.not-a-session"),
    );
    assert.equal(invalid.status, 401);
    assert.deepEqual(invalid.body, { error: "unauthorized_operator" });
  });

  it("rejects an unknown environment and a body that is not a commercial ask", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");

    const surface = await handleSourcingHandshakeRequest(
      postHandshake("staging", { qualityId: QUALITY_ID, targetFields: ["price"], brandOrgId: BRAND }, cookie),
    );
    assert.equal(surface.status, 400);
    assert.deepEqual(surface.body, { error: "invalid_environment_surface" });

    const missing = await handleSourcingHandshakeRequest(postHandshake("test", { qualityId: QUALITY_ID }, cookie));
    assert.equal(missing.status, 400);
    assert.deepEqual(missing.body, { error: "missing_mandatory_handshake_parameters" });

    const commercial = await handleSourcingHandshakeRequest(
      postHandshake(
        "test",
        { qualityId: QUALITY_ID, targetFields: ["price", "brandOrgId"], brandOrgId: BRAND },
        cookie,
      ),
    );
    assert.equal(commercial.status, 400);
    assert.deepEqual(commercial.body, { error: "invalid_commercial_target_field" });
    assert.equal(JSON.stringify(commercial.body).includes(BRAND), false);
  });

  it("writes the pending request on the header schema and leaves the brand out of the response", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const testPool = ledgerPool({ schema: "fruma_test", cell: CELL });
    const demoPool = ledgerPool({ schema: "fruma_demo", cell: { ...CELL, supplier_org_id: "org_mill_synthetic" } });
    setPostgresPoolForTests("test", testPool);
    setPostgresPoolForTests("demo", demoPool);

    const created = await handleSourcingHandshakeRequest(
      postHandshake(
        "test",
        { qualityId: QUALITY_ID, targetFields: ["price", "moq", "lead_time"], brandOrgId: BRAND },
        cookie,
      ),
    );
    assert.equal(created.status, 201);
    assert.equal(created.surface, "test");
    if (created.status !== 201) return;
    assert.equal(created.body.success, true);
    assert.equal(created.body.status, "PENDING");
    assert.match(created.body.requestId, /^[0-9a-f-]{36}$/i);
    assert.equal(Number.isNaN(Date.parse(created.body.timestamp)), false);
    const published = JSON.stringify(created.body);
    assert.equal(published.includes(BRAND), false);
    assert.equal(published.includes("brandOrgId"), false);
    assert.equal(published.includes("brandId"), false);

    assert.equal(testPool.connects, 1);
    assert.equal(testPool.releases, 1);
    assert.equal(demoPool.connects, 0);
    const insert = testPool.calls.find((call) => call.query.includes("INSERT INTO fruma_mill_requests"));
    const stored = String(insert?.parameters?.[4] ?? "");
    assert.equal(stored.includes(BRAND), false);
    assert.equal(stored.includes("brandOrgId"), false);
    assert.match(stored, /"qualityId":"cell:dep-mill:2:A:Sheet1"/);
    assert.match(stored, /"status":"PENDING"/);

    const demo = await handleSourcingHandshakeRequest(
      postHandshake("demo", { qualityId: QUALITY_ID, targetFields: ["moq"], brandOrgId: BRAND }, cookie),
    );
    assert.equal(demo.status, 201);
    assert.equal(demo.surface, "demo");
    assert.equal(demoPool.connects, 1);
    assert.equal(testPool.connects, 1);
    assert.equal(demoPool.calls.some((call) => call.query.includes("SET search_path TO fruma_demo;")), true);
  });

  it("returns a ledger failure and still releases the connection", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const pool = ledgerPool({ schema: "fruma_production", cell: null });
    setPostgresPoolForTests("production", pool);
    const failed = await handleSourcingHandshakeRequest(
      postHandshake("production", { qualityId: "missing-cell", targetFields: ["lead_time"], brandOrgId: BRAND }, cookie),
    );
    assert.equal(failed.status, 500);
    assert.equal(failed.surface, "production");
    assert.deepEqual(failed.body, { error: "internal_ledger_execution_failure" });
    assert.equal(JSON.stringify(failed.body).includes(BRAND), false);
    assert.equal(JSON.stringify(failed.body).includes("missing-cell"), false);
    assert.equal(pool.releases, 1);
    assert.equal(pool.calls.some((call) => call.query.includes("INSERT INTO")), false);
  });
});
