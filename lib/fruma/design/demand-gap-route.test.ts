import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import type { Client } from "../persist/reload-engines";
import { setPostgresPoolForTests, type PostgresPool } from "../persist/postgres-store";
import { handleFactoryMarketOpportunitiesRequest } from "./demand-gap-http";

const MILL = "org_mill_woven_demand";
const TEST_PASS = "demand-gap-route-password";

const LOOM = {
  min_gsm: 200,
  max_gsm: 400,
  max_usable_width_cm: 150,
  yarn_feed_compatibility: ["Cotton"],
};

const WITHIN = {
  search_id: "search-a-300-woven-cotton",
  requested_gsm: 300,
  requested_width_cm: 150,
  requested_fibers: ["Cotton"],
  result_count: 0,
};

const BEYOND = {
  search_id: "search-b-600-woven-cotton",
  requested_gsm: 600,
  requested_width_cm: 150,
  requested_fibers: ["Cotton"],
  result_count: 0,
};

type Call = { query: string; parameters?: readonly unknown[] };

function ledgerPool(options: {
  schema: string;
  looms?: Record<string, unknown>[];
  searches?: Record<string, unknown>[];
  failSchema?: boolean;
}): PostgresPool & { calls: Call[]; connects: number; releases: number } {
  const calls: Call[] = [];
  const state = { connects: 0, releases: 0 };
  return {
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
          if (options.failSchema || query.includes("current_schema")) {
            if (options.failSchema) return [{ schema_name: "public" }];
            return [{ schema_name: options.schema }];
          }
          if (query.trim().startsWith("SET search_path")) return [];
          if (query.includes("fruma_factory_profiles")) return options.looms ?? [];
          if (query.includes("fruma_search_telemetry")) return options.searches ?? [];
          throw new Error(`Unexpected demand-gap query: ${query}`);
        },
        release() {
          state.releases += 1;
        },
      };
      return client;
    },
  };
}

function getOpportunities(version: string | null, millOrgId?: string, cookie?: string): Request {
  const headers = new Headers();
  if (version) headers.set("x-fruma-version", version);
  if (cookie) headers.set("cookie", `${DEMO_COOKIE}=${cookie}`);
  const query = millOrgId === undefined ? "" : `?millOrgId=${encodeURIComponent(millOrgId)}`;
  return new Request(`http://localhost/api/analytics/demand-gap${query}`, { method: "GET", headers });
}

describe("GET /api/analytics/demand-gap", { concurrency: 1 }, () => {
  afterEach(() => {
    for (const version of ["demo", "test", "production"] as const) {
      setPostgresPoolForTests(version, null);
    }
  });

  it("delegates the route to the schema-pinned market-opportunity handler", () => {
    const route = readFileSync(join(process.cwd(), "app/api/analytics/demand-gap/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/design/demand-gap-http.ts"), "utf8");
    assert.match(route, /import "server-only"/);
    assert.match(route, /export const runtime = "nodejs"/);
    assert.match(route, /export async function GET\(request: Request\)/);
    assert.match(route, /handleFactoryMarketOpportunitiesRequest/);
    assert.equal(route.includes("calculateFactoryMarketOpportunities"), false);
    assert.match(handler, /requireTestFounder\(request\)/);
    assert.match(handler, /getPostgresPool\(version\)/);
    assert.match(handler, /calculateFactoryMarketOpportunities\(client, millOrgId\)/);
    assert.match(handler, /client\?\.release\(\)/);
  });

  it("returns 401 when the founder session cookie is missing or invalid", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const pool = ledgerPool({ schema: "fruma_test", looms: [LOOM], searches: [WITHIN, BEYOND] });
    setPostgresPoolForTests("test", pool);

    const missing = await handleFactoryMarketOpportunitiesRequest(getOpportunities("test", MILL));
    assert.equal(missing.status, 401);
    assert.equal(missing.surface, "test");
    assert.deepEqual(missing.body, { error: "unauthorized_operator" });

    const invalid = await handleFactoryMarketOpportunitiesRequest(
      getOpportunities("demo", MILL, "owen.not-a-session"),
    );
    assert.equal(invalid.status, 401);
    assert.deepEqual(invalid.body, { error: "unauthorized_operator" });
    assert.equal(pool.connects, 0);
  });

  it("rejects a missing mill and an unknown environment before opening a pool", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const pool = ledgerPool({ schema: "fruma_test", looms: [LOOM], searches: [WITHIN] });
    setPostgresPoolForTests("test", pool);

    const missing = await handleFactoryMarketOpportunitiesRequest(getOpportunities("test", "   ", cookie));
    assert.equal(missing.status, 400);
    assert.equal(missing.surface, "test");
    assert.deepEqual(missing.body, { error: "missing_mandatory_mill_identifier" });

    const absent = await handleFactoryMarketOpportunitiesRequest(getOpportunities("staging", undefined, cookie));
    assert.equal(absent.status, 400);
    assert.deepEqual(absent.body, { error: "missing_mandatory_mill_identifier" });

    const surface = await handleFactoryMarketOpportunitiesRequest(getOpportunities("staging", MILL, cookie));
    assert.equal(surface.status, 400);
    assert.equal(surface.surface, null);
    assert.deepEqual(surface.body, { error: "invalid_environment_surface" });
    assert.equal(pool.connects, 0);
  });

  it("returns the 300 GSM opportunity on the header schema and an empty demo result", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const testPool = ledgerPool({ schema: "fruma_test", looms: [LOOM], searches: [WITHIN, BEYOND] });
    const demoPool = ledgerPool({ schema: "fruma_demo", looms: [], searches: [WITHIN, BEYOND] });
    setPostgresPoolForTests("test", testPool);
    setPostgresPoolForTests("demo", demoPool);

    const started = Date.now();
    const found = await handleFactoryMarketOpportunitiesRequest(getOpportunities("test", `  ${MILL}  `, cookie));
    assert.equal(found.status, 200);
    assert.equal(found.surface, "test");
    if (found.status !== 200) return;
    assert.equal(found.body.success, true);
    assert.equal(found.body.millOrgId, MILL);
    assert.deepEqual(found.body.opportunities, [
      { target_gsm: 300, target_width: 150, unfulfilled_search_volume: 1 },
    ]);
    assert.equal(JSON.stringify(found.body.opportunities).includes(BEYOND.search_id), false);
    const computedAt = Date.parse(found.body.computedAt);
    assert.equal(Number.isNaN(computedAt), false);
    assert.ok(computedAt >= started - 1000 && computedAt <= Date.now() + 1000);

    assert.equal(testPool.connects, 1);
    assert.equal(testPool.releases, 1);
    assert.equal(demoPool.connects, 0);
    const capability = testPool.calls.find((call) => call.query.includes("fruma_factory_profiles"));
    assert.deepEqual(capability?.parameters, [MILL]);
    assert.equal(testPool.calls.some((call) => call.query.includes("SET search_path TO fruma_test;")), true);
    assert.equal(testPool.calls.some((call) => call.query.includes("fruma_search_telemetry")), true);

    const hidden = await handleFactoryMarketOpportunitiesRequest(getOpportunities(null, MILL, cookie));
    assert.equal(hidden.status, 200);
    assert.equal(hidden.surface, "demo");
    if (hidden.status !== 200) return;
    assert.deepEqual(hidden.body.opportunities, []);
    assert.equal(demoPool.connects, 1);
    assert.equal(demoPool.releases, 1);
    assert.equal(testPool.connects, 1);
    assert.equal(demoPool.calls.some((call) => call.query.includes("SET search_path TO fruma_demo;")), true);
    assert.equal(demoPool.calls.some((call) => call.query.includes("fruma_search_telemetry")), false);
  });

  it("returns a ledger failure and still releases the connection", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const pool = ledgerPool({ schema: "fruma_production", failSchema: true });
    setPostgresPoolForTests("production", pool);

    const failed = await handleFactoryMarketOpportunitiesRequest(getOpportunities("production", MILL, cookie));
    assert.equal(failed.status, 500);
    assert.equal(failed.surface, "production");
    assert.deepEqual(failed.body, { error: "internal_ledger_execution_failure" });
    assert.equal(JSON.stringify(failed.body).includes(MILL), false);
    assert.equal(JSON.stringify(failed.body).includes("public"), false);
    assert.equal(pool.releases, 1);
  });
});
