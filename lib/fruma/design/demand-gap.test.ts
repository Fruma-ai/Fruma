import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Client } from "../persist/reload-engines";
import { calculateFactoryMarketOpportunities } from "./demand-gap";

const MILL = "org_mill_test";
const BRAND = "org_brand_secret_gap";

type Call = { query: string; parameters?: readonly unknown[] };

function gapClient(options: {
  schema?: string;
  looms?: Record<string, unknown>[];
  searches?: Record<string, unknown>[];
}): Client & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async unsafe(query: string, parameters?: readonly unknown[]) {
      calls.push({ query, parameters });
      if (query.includes("current_schema")) return [{ schema_name: options.schema ?? "fruma_test" }];
      if (query.trim().startsWith("SET search_path")) return [];
      if (query.includes("FROM fruma_factory_profiles")) return options.looms ?? [];
      if (query.includes("FROM fruma_search_telemetry")) return options.searches ?? [];
      throw new Error(`Unexpected demand-gap query: ${query}`);
    },
  };
}

const WOVEN = {
  min_gsm: 100,
  max_gsm: 450,
  max_usable_width_cm: 180,
  yarn_feed_compatibility: ["cotton", "linen"],
};

describe("calculateFactoryMarketOpportunities", () => {
  it("pins the schema and counts zero-result briefs that fit the mill looms", async () => {
    const client = gapClient({
      looms: [WOVEN],
      searches: [
        {
          search_id: "search-220-a",
          requested_gsm: 220,
          requested_width_cm: 150,
          requested_fibers: ["Cotton", "linen"],
          brand_org_id: BRAND,
          result_count: 0,
        },
        {
          search_id: "search-220-b",
          requested_gsm: 220,
          requested_width_cm: 150,
          requested_fibers: ["cotton"],
          result_count: 0,
        },
        {
          search_id: "search-220-a",
          requested_gsm: 220,
          requested_width_cm: 150,
          requested_fibers: ["cotton", "linen"],
          result_count: 0,
        },
        {
          search_id: "search-edge",
          requested_gsm: 450,
          requested_width_cm: 180,
          requested_fibers: ["linen"],
          result_count: 0,
        },
      ],
    });

    const opportunities = await calculateFactoryMarketOpportunities(client, MILL);

    assert.deepEqual(opportunities, [
      { target_gsm: 220, target_width: 150, unfulfilled_search_volume: 2 },
      { target_gsm: 450, target_width: 180, unfulfilled_search_volume: 1 },
    ]);
    assert.equal(JSON.stringify(opportunities).includes(BRAND), false);

    const text = client.calls.map((call) => call.query.trim());
    assert.match(text[0] ?? "", /current_schema/);
    assert.equal(text[1], "SET search_path TO fruma_test;");
    assert.match(text[2] ?? "", /FROM fruma_factory_profiles/);
    assert.match(text[2] ?? "", /fruma_loom_capabilities/);
    assert.match(text[2] ?? "", /MAX\(version\)/);
    assert.match(text[2] ?? "", /is_active = TRUE/);
    assert.deepEqual(client.calls[2]?.parameters, [MILL]);
    assert.match(text[3] ?? "", /FROM fruma_search_telemetry/);
    assert.match(text[3] ?? "", /result_count = 0/);
    assert.equal(text[3]?.includes("brand"), false);
    assert.equal(client.calls[3]?.parameters, undefined);
    assert.equal(text.some((query) => query.includes("fruma_demo")), false);
    assert.equal(text.some((query) => query.includes("fruma_production")), false);
  });

  it("keeps briefs that sit outside gsm, width, or yarn feed out of the payload", async () => {
    const client = gapClient({
      looms: [
        WOVEN,
        {
          min_gsm: 80,
          max_gsm: 120,
          max_usable_width_cm: 140,
          yarn_feed_compatibility: ["cotton"],
        },
      ],
      searches: [
        {
          search_id: "too-heavy",
          requested_gsm: 451,
          requested_width_cm: 150,
          requested_fibers: ["cotton"],
        },
        {
          search_id: "too-wide",
          requested_gsm: 220,
          requested_width_cm: 181,
          requested_fibers: ["cotton", "linen"],
        },
        {
          search_id: "wrong-fiber",
          requested_gsm: 220,
          requested_width_cm: 150,
          requested_fibers: ["cotton", "silk"],
        },
        {
          search_id: "knit-fit",
          requested_gsm: 100,
          requested_width_cm: 140,
          requested_fibers: ["cotton"],
        },
        {
          search_id: "empty-fiber",
          requested_gsm: 200,
          requested_width_cm: 140,
          requested_fibers: [],
        },
        {
          search_id: "already-filled",
          requested_gsm: 220,
          requested_width_cm: 150,
          requested_fibers: ["cotton", "linen"],
          result_count: 3,
        },
      ],
    });

    const opportunities = await calculateFactoryMarketOpportunities(client, `  ${MILL}  `);
    assert.deepEqual(opportunities, [
      { target_gsm: 100, target_width: 140, unfulfilled_search_volume: 1 },
    ]);
    assert.deepEqual(client.calls[2]?.parameters, [MILL]);
  });

  it("refuses a connection outside the ledger schemas and returns nothing when the mill has no looms", async () => {
    const outside = gapClient({ schema: "public", looms: [WOVEN], searches: [] });
    await assert.rejects(
      () => calculateFactoryMarketOpportunities(outside, MILL),
      /not a Fruma ledger schema/,
    );
    assert.equal(outside.calls.some((call) => call.query.includes("fruma_factory_profiles")), false);
    assert.equal(outside.calls.some((call) => call.query.includes("fruma_search_telemetry")), false);

    const empty = gapClient({
      schema: "fruma_demo",
      looms: [],
      searches: [
        {
          search_id: "unseen",
          requested_gsm: 220,
          requested_width_cm: 150,
          requested_fibers: ["cotton"],
        },
      ],
    });
    const opportunities = await calculateFactoryMarketOpportunities(empty, MILL);
    assert.deepEqual(opportunities, []);
    assert.equal(empty.calls[1]?.query.trim(), "SET search_path TO fruma_demo;");
    assert.equal(empty.calls.some((call) => call.query.includes("fruma_search_telemetry")), false);
    await assert.rejects(() => calculateFactoryMarketOpportunities(empty, "  "), /mill_org_required/);
  });
});
