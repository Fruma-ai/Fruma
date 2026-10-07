import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import { assertWorkspaceDataDirUntouched, installDiskFreeSchemas } from "../persist/disk-free";
import { getSpineStore, setSpineStoreForTests } from "../persist";
import { dropSchemaStatement, ledgerSchemaName, searchPathStatement } from "../persist/postgres-schema";
import type { Client } from "../persist/reload-engines";
import type { FrumaVersion } from "../versions";
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

const DEMAND_MILL = "org_mill_woven_demand";
const SEARCH_A = "search-a-300-woven-cotton";
const SEARCH_B = "search-b-600-woven-cotton";
const LOOM_MIN_GSM = 200;
const LOOM_MAX_GSM = 400;
const LOOM_WIDTH_CM = 150;

type DemandProfile = {
  id: string;
  mill_org_id: string;
  version: number;
  is_active: boolean;
};

type DemandLoom = {
  id: string;
  factory_profile_id: string;
  construction_type: string;
  min_gsm: number;
  max_gsm: number;
  max_usable_width_cm: number;
  yarn_feed_compatibility: string[];
};

type DemandSearch = {
  search_id: string;
  requested_gsm: number;
  requested_width_cm: number;
  requested_fibers: string[];
  result_count: number;
};

type SchemaSession = Client & { close(): Promise<void> };

const demandProfiles = new Map<string, DemandProfile[]>();
const demandLooms = new Map<string, DemandLoom[]>();
const demandSearches = new Map<string, DemandSearch[]>();

const INSERT_PROFILE = `
  INSERT INTO fruma_factory_profiles (
    mill_org_id, facility_name, country_location, active_loom_count
  )
  VALUES ($1, $2, $3, $4)
  RETURNING id, version, is_active
`;

const INSERT_LOOM = `
  INSERT INTO fruma_loom_capabilities (
    factory_profile_id, construction_type, min_gsm, max_gsm, max_usable_width_cm, yarn_feed_compatibility
  )
  VALUES ($1, $2, $3, $4, $5, $6::jsonb)
  RETURNING id
`;

const INSERT_SEARCH = `
  INSERT INTO fruma_search_telemetry (
    search_id, requested_gsm, requested_width_cm, requested_fibers, result_count, searched_at
  )
  VALUES ($1, $2, $3, $4::jsonb, $5, $6)
`;

const STORED_SEARCHES = `
  SELECT search_id, requested_gsm, result_count
  FROM fruma_search_telemetry
  ORDER BY requested_gsm ASC
`;

function parseFibers(value: unknown): string[] {
  const parsed = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => String(item));
}

function memoryDemandSession(surface: FrumaVersion): SchemaSession {
  let schemaName: string = ledgerSchemaName(surface);
  return {
    async unsafe(query: string, parameters?: readonly unknown[]) {
      if (query.includes("current_schema")) return [{ schema_name: schemaName }];
      const searchPath = query.trim().match(/^SET search_path TO (fruma_[a-z]+);$/);
      if (searchPath) {
        schemaName = searchPath[1] ?? schemaName;
        return [];
      }
      if (query.includes("INSERT INTO fruma_factory_profiles")) {
        const [millOrgId] = parameters ?? [];
        const row: DemandProfile = {
          id: randomUUID(),
          mill_org_id: String(millOrgId),
          version: 1,
          is_active: true,
        };
        const rows = demandProfiles.get(schemaName) ?? [];
        rows.push(row);
        demandProfiles.set(schemaName, rows);
        return [{ id: row.id, version: row.version, is_active: row.is_active }];
      }
      if (query.includes("INSERT INTO fruma_loom_capabilities")) {
        const [profileId, construction, minGsm, maxGsm, width, yarn] = parameters ?? [];
        const profile = (demandProfiles.get(schemaName) ?? []).find((row) => row.id === String(profileId));
        if (!profile) throw new Error(`factory_profile_id ${String(profileId)} is not in ${schemaName}`);
        const row: DemandLoom = {
          id: randomUUID(),
          factory_profile_id: profile.id,
          construction_type: String(construction),
          min_gsm: Number(minGsm),
          max_gsm: Number(maxGsm),
          max_usable_width_cm: Number(width),
          yarn_feed_compatibility: parseFibers(yarn),
        };
        const rows = demandLooms.get(schemaName) ?? [];
        rows.push(row);
        demandLooms.set(schemaName, rows);
        return [{ id: row.id }];
      }
      if (query.includes("INSERT INTO fruma_search_telemetry")) {
        const [searchId, gsm, width, yarn, resultCount] = parameters ?? [];
        const row: DemandSearch = {
          search_id: String(searchId),
          requested_gsm: Number(gsm),
          requested_width_cm: Number(width),
          requested_fibers: parseFibers(yarn),
          result_count: Number(resultCount),
        };
        const rows = demandSearches.get(schemaName) ?? [];
        rows.push(row);
        demandSearches.set(schemaName, rows);
        return [];
      }
      if (query.includes("FROM fruma_factory_profiles") && query.includes("fruma_loom_capabilities")) {
        const millOrgId = String(parameters?.[0] ?? "");
        const active = (demandProfiles.get(schemaName) ?? []).filter(
          (row) => row.mill_org_id === millOrgId && row.is_active,
        );
        const latest = active.reduce((max, row) => Math.max(max, row.version), 0);
        const profileIds = new Set(active.filter((row) => row.version === latest).map((row) => row.id));
        return (demandLooms.get(schemaName) ?? [])
          .filter((row) => profileIds.has(row.factory_profile_id))
          .map((row) => ({
            min_gsm: row.min_gsm,
            max_gsm: row.max_gsm,
            max_usable_width_cm: row.max_usable_width_cm,
            yarn_feed_compatibility: row.yarn_feed_compatibility,
          }));
      }
      if (query.includes("FROM fruma_search_telemetry")) {
        const rows = [...(demandSearches.get(schemaName) ?? [])].sort(
          (a, b) => a.requested_gsm - b.requested_gsm || a.search_id.localeCompare(b.search_id),
        );
        const visible = query.includes("result_count = 0") ? rows.filter((row) => row.result_count === 0) : rows;
        return visible.map((row) => ({
          search_id: row.search_id,
          requested_gsm: row.requested_gsm,
          requested_width_cm: row.requested_width_cm,
          requested_fibers: row.requested_fibers,
          result_count: row.result_count,
        }));
      }
      throw new Error(`Unexpected demand-gap lifecycle query: ${query}`);
    },
    async close() {},
  };
}

async function openDemandSession(surface: FrumaVersion): Promise<SchemaSession> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return memoryDemandSession(surface);
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

async function resetDemandSchema(surface: FrumaVersion): Promise<void> {
  await getSpineStore(surface).reset();
  const schema = ledgerSchemaName(surface);
  demandProfiles.delete(schema);
  demandLooms.delete(schema);
  demandSearches.delete(schema);
}

describe("inverse-design demand matching", { concurrency: 1 }, () => {
  afterEach(() => {
    demandProfiles.clear();
    demandLooms.clear();
    demandSearches.clear();
    setSpineStoreForTests(null);
    assertWorkspaceDataDirUntouched();
  });

  it("keeps the 300 GSM cotton brief and ignores the 600 GSM brief outside fruma_demo", async () => {
    assert.equal(ledgerSchemaName("test"), "fruma_test");
    assert.equal(dropSchemaStatement("test"), "DROP SCHEMA IF EXISTS fruma_test CASCADE;");
    assert.equal(searchPathStatement("test"), "SET search_path TO fruma_test;");
    assert.equal(searchPathStatement("demo"), "SET search_path TO fruma_demo;");
    assertWorkspaceDataDirUntouched();

    const schemas = installDiskFreeSchemas();
    const sessions: SchemaSession[] = [];
    try {
      await resetDemandSchema("demo");
      await resetDemandSchema("test");
      assert.equal(schemas.test, getSpineStore("test"));
      assert.equal(schemas.demo, getSpineStore("demo"));
      assertWorkspaceDataDirUntouched();

      const testSession = await openDemandSession("test");
      const demoSession = await openDemandSession("demo");
      sessions.push(testSession, demoSession);
      await testSession.unsafe(searchPathStatement("test"));
      await demoSession.unsafe(searchPathStatement("demo"));
      const testSchema = await testSession.unsafe(`SELECT current_schema() AS schema_name`);
      const demoSchema = await demoSession.unsafe(`SELECT current_schema() AS schema_name`);
      assert.equal(String(testSchema[0]?.schema_name), "fruma_test");
      assert.equal(String(demoSchema[0]?.schema_name), "fruma_demo");

      const before = await calculateFactoryMarketOpportunities(testSession, DEMAND_MILL);
      assert.deepEqual(before, []);
      assertWorkspaceDataDirUntouched();

      const inserted = await testSession.unsafe(INSERT_PROFILE, [DEMAND_MILL, "Woven Shed", "PT", 8]);
      const profileId = String(inserted[0]?.id);
      assert.equal(Number(inserted[0]?.version), 1);
      assert.equal(inserted[0]?.is_active, true);
      await testSession.unsafe(INSERT_LOOM, [
        profileId,
        "WOVEN",
        LOOM_MIN_GSM,
        LOOM_MAX_GSM,
        LOOM_WIDTH_CM,
        JSON.stringify(["Cotton"]),
      ]);

      await testSession.unsafe(INSERT_SEARCH, [
        SEARCH_A,
        300,
        LOOM_WIDTH_CM,
        JSON.stringify(["Cotton"]),
        0,
        "2026-10-07T16:00:00.000Z",
      ]);
      await testSession.unsafe(INSERT_SEARCH, [
        SEARCH_B,
        600,
        LOOM_WIDTH_CM,
        JSON.stringify(["Cotton"]),
        0,
        "2026-10-07T16:05:00.000Z",
      ]);
      const stored = await testSession.unsafe(STORED_SEARCHES);
      assert.deepEqual(
        stored.map((row) => ({
          search_id: String(row.search_id),
          requested_gsm: Number(row.requested_gsm),
          result_count: Number(row.result_count),
        })),
        [
          { search_id: SEARCH_A, requested_gsm: 300, result_count: 0 },
          { search_id: SEARCH_B, requested_gsm: 600, result_count: 0 },
        ],
      );
      assertWorkspaceDataDirUntouched();

      const opportunities = await calculateFactoryMarketOpportunities(testSession, DEMAND_MILL);
      assert.deepEqual(opportunities, [
        { target_gsm: 300, target_width: LOOM_WIDTH_CM, unfulfilled_search_volume: 1 },
      ]);
      assert.equal(
        opportunities.some((row) => row.target_gsm === 600),
        false,
      );
      assert.equal(JSON.stringify(opportunities).includes(SEARCH_B), false);
      assertWorkspaceDataDirUntouched();

      const hidden = await calculateFactoryMarketOpportunities(demoSession, DEMAND_MILL);
      assert.deepEqual(hidden, []);
      const stillThere = await calculateFactoryMarketOpportunities(testSession, DEMAND_MILL);
      assert.deepEqual(stillThere, opportunities);
      assertWorkspaceDataDirUntouched();
    } finally {
      for (const session of sessions) await session.close();
      schemas.close();
      demandProfiles.clear();
      demandLooms.clear();
      demandSearches.clear();
      assertWorkspaceDataDirUntouched();
    }
  });
});
