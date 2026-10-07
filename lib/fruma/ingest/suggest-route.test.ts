import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { DEMO_COOKIE, sessionToken } from "../../gate";
import type { Client } from "../persist/reload-engines";
import { setPostgresPoolForTests, type PostgresPool } from "../persist/postgres-store";
import { formatConverted, convertOunceToGsm } from "./units";
import { handleAcceptStagedSuggestionsRequest } from "./suggest-http";

const DEPOSIT = "dep_accept";
const TEST_PASS = "suggest-route-password";

type Call = { query: string; parameters?: readonly unknown[] };

function ledgerPool(options: {
  schema: string;
  staged?: Record<string, unknown>[];
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
          if (query.includes("FROM fruma_staged_suggestions")) return options.staged ?? [];
          if (query.includes("INSERT INTO fruma_cell_mutation_events")) return [];
          throw new Error(`Unexpected suggest query: ${query}`);
        },
        release() {
          state.releases += 1;
        },
      };
      return client;
    },
  };
}

function postAccept(
  version: string | null,
  body: unknown,
  cookie?: string,
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (version) headers.set("x-fruma-version", version);
  if (cookie) headers.set("cookie", `${DEMO_COOKIE}=${cookie}`);
  return new Request("http://localhost/api/analytics/suggest", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/suggest", { concurrency: 1 }, () => {
  afterEach(() => {
    for (const version of ["demo", "test", "production"] as const) {
      setPostgresPoolForTests(version, null);
    }
  });

  it("delegates the route to the schema-pinned accept handler", () => {
    const route = readFileSync(join(process.cwd(), "app/api/analytics/suggest/route.ts"), "utf8");
    const handler = readFileSync(join(process.cwd(), "lib/fruma/ingest/suggest-http.ts"), "utf8");
    assert.match(route, /import "server-only"/);
    assert.match(route, /export const runtime = "nodejs"/);
    assert.match(route, /export async function POST\(request: Request\)/);
    assert.match(route, /handleAcceptStagedSuggestionsRequest/);
    assert.equal(route.includes("acceptStagedSuggestions"), false);
    assert.equal(route.includes("UPDATE"), false);
    assert.match(handler, /requireTestFounder\(request\)/);
    assert.match(handler, /getPostgresPool\(version\)/);
    assert.match(handler, /acceptStagedSuggestions\(/);
    assert.match(handler, /client\?\.release\(\)/);
  });

  it("returns 401 when the founder session cookie is missing", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const pool = ledgerPool({ schema: "fruma_test" });
    setPostgresPoolForTests("test", pool);

    const missing = await handleAcceptStagedSuggestionsRequest(
      postAccept("test", { depositId: DEPOSIT, selectedCellIds: ["weight"] }),
    );
    assert.equal(missing.status, 401);
    assert.deepEqual(missing.body, { error: "unauthorized_operator" });
    assert.equal(pool.connects, 0);
  });

  it("rejects a missing selection and an unknown environment before opening a pool", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const pool = ledgerPool({ schema: "fruma_test" });
    setPostgresPoolForTests("test", pool);

    const missing = await handleAcceptStagedSuggestionsRequest(
      postAccept("test", { depositId: DEPOSIT, selectedCellIds: [] }, cookie),
    );
    assert.equal(missing.status, 400);
    assert.deepEqual(missing.body, { error: "missing_selected_cells" });

    const surface = await handleAcceptStagedSuggestionsRequest(
      postAccept("staging", { depositId: DEPOSIT, selectedCellIds: ["weight"] }, cookie),
    );
    assert.equal(surface.status, 400);
    assert.deepEqual(surface.body, { error: "invalid_environment_surface" });
    assert.equal(pool.connects, 0);
  });

  it("confirms the ounce cell on the header schema and releases the connection", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const gsm = formatConverted(convertOunceToGsm(8.2));
    const pool = ledgerPool({
      schema: "fruma_test",
      staged: [
        {
          target_field: "weight",
          suggested_value: "8.2 oz",
          source_value: "8.2 oz",
        },
      ],
    });
    setPostgresPoolForTests("test", pool);

    const found = await handleAcceptStagedSuggestionsRequest(
      postAccept("test", { depositId: `  ${DEPOSIT}  `, selectedCellIds: ["weight"] }, cookie),
    );
    assert.equal(found.status, 200);
    assert.equal(found.surface, "test");
    if (found.status !== 200) return;
    assert.equal(found.body.depositId, DEPOSIT);
    assert.equal(found.body.accepted.length, 1);
    assert.equal(found.body.accepted[0]?.normalizedValue, gsm);
    assert.equal(found.body.accepted[0]?.targetField, "weight");
    assert.equal(pool.connects, 1);
    assert.equal(pool.releases, 1);
    const insert = pool.calls.find((call) => call.query.includes("INSERT INTO fruma_cell_mutation_events"));
    assert.deepEqual(insert?.parameters?.slice(1, 5), ["weight", cookie, gsm, "weight"]);
    assert.equal(pool.calls.some((call) => /\bUPDATE\b/.test(call.query)), false);
    assert.equal(pool.calls.some((call) => call.query.includes("SET search_path TO fruma_test;")), true);
  });

  it("returns a ledger failure and still releases the connection", async () => {
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS;
    const cookie = await sessionToken("owen");
    const pool = ledgerPool({ schema: "fruma_production", failSchema: true });
    setPostgresPoolForTests("production", pool);

    const failed = await handleAcceptStagedSuggestionsRequest(
      postAccept("production", { depositId: DEPOSIT, selectedCellIds: ["weight"] }, cookie),
    );
    assert.equal(failed.status, 500);
    assert.deepEqual(failed.body, { error: "internal_ledger_execution_failure" });
    assert.equal(pool.releases, 1);
  });
});
