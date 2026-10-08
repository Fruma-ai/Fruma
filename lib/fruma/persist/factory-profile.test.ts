import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import type { FrumaVersion } from "../versions";
import { assertWorkspaceDataDirUntouched, installDiskFreeSchemas } from "./disk-free";
import { getSpineStore, setSpineStoreForTests } from "./index";
import { dropSchemaStatement, ledgerSchemaName, postgresLedgerSchema, searchPathStatement } from "./postgres-schema";
import type { Client } from "./reload-engines";

const MILL_ORG_ID = "org_mill_test";
const FACILITY_NAME = "Vale do Ave Mill";
const COUNTRY = "PT";
const LOOM_COUNT = 24;
const CONSTRUCTION = "WOVEN";
const MIN_GSM = 100;
const MAX_GSM = 450;
const WIDTH_CM = 180;
const YARN_FEEDS = ["cotton", "linen"];

type ProfileRow = {
  id: string;
  mill_org_id: string;
  facility_name: string;
  country_location: string;
  active_loom_count: number;
  version: number;
  is_active: boolean;
};

type CapabilityRow = {
  id: string;
  factory_profile_id: string;
  construction_type: string;
  min_gsm: number;
  max_gsm: number;
  max_usable_width_cm: number;
  yarn_feed_compatibility: string[];
  version: number;
};

type MachineProfile = {
  id: string;
  mill_org_id: string;
  facility_name: string;
  country_location: string;
  active_loom_count: number;
  profile_version: number;
  is_active: boolean;
  capability_id: string;
  factory_profile_id: string;
  construction_type: string;
  min_gsm: number;
  max_gsm: number;
  max_usable_width_cm: number;
  yarn_feed_compatibility: string[];
  capability_version: number;
};

type SchemaSession = Client & { close(): Promise<void> };

const profiles = new Map<string, ProfileRow[]>();
const capabilities = new Map<string, CapabilityRow[]>();

const INSERT_PROFILE = `
  INSERT INTO fruma_factory_profiles (
    mill_org_id, facility_name, country_location, active_loom_count
  )
  VALUES ($1, $2, $3, $4)
  RETURNING id, version, is_active
`;

const INSERT_CAPABILITY = `
  INSERT INTO fruma_loom_capabilities (
    factory_profile_id, construction_type, min_gsm, max_gsm, max_usable_width_cm, yarn_feed_compatibility
  )
  VALUES ($1, $2, $3, $4, $5, $6::jsonb)
  RETURNING id, version
`;

const LOOKUP_PROFILE = `
  SELECT
    p.id,
    p.mill_org_id,
    p.facility_name,
    p.country_location,
    p.active_loom_count,
    p.version AS profile_version,
    p.is_active,
    c.id AS capability_id,
    c.factory_profile_id,
    c.construction_type,
    c.min_gsm,
    c.max_gsm,
    c.max_usable_width_cm,
    c.yarn_feed_compatibility,
    c.version AS capability_version
  FROM fruma_factory_profiles p
  INNER JOIN fruma_loom_capabilities c ON c.factory_profile_id = p.id
  WHERE p.mill_org_id = $1
`;

function tableBody(table: "fruma_factory_profiles" | "fruma_loom_capabilities"): string {
  const ddl = postgresLedgerSchema("fruma_test");
  const marker = `CREATE TABLE IF NOT EXISTS fruma_test.${table} (`;
  const start = ddl.indexOf(marker);
  assert.ok(start >= 0, table);
  const rest = ddl.slice(start + marker.length);
  const end = rest.indexOf(");");
  assert.ok(end > 0, table);
  return rest.slice(0, end);
}

function versionDefault(table: "fruma_factory_profiles" | "fruma_loom_capabilities"): number {
  const match = tableBody(table).match(/version INTEGER NOT NULL DEFAULT (\d+)/);
  assert.ok(match, `${table} version default`);
  return Number(match[1]);
}

function profileActiveDefault(): boolean {
  const match = tableBody("fruma_factory_profiles").match(/is_active BOOLEAN NOT NULL DEFAULT (TRUE|FALSE)/);
  assert.ok(match, "factory profile is_active default");
  return match[1] === "TRUE";
}

function memorySession(surface: FrumaVersion): SchemaSession {
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
        const [millOrgId, facilityName, country, loomCount] = parameters ?? [];
        const row: ProfileRow = {
          id: randomUUID(),
          mill_org_id: String(millOrgId),
          facility_name: String(facilityName),
          country_location: String(country),
          active_loom_count: Number(loomCount),
          version: versionDefault("fruma_factory_profiles"),
          is_active: profileActiveDefault(),
        };
        const rows = profiles.get(schemaName) ?? [];
        rows.push(row);
        profiles.set(schemaName, rows);
        return [{ id: row.id, version: row.version, is_active: row.is_active }];
      }
      if (query.includes("INSERT INTO fruma_loom_capabilities")) {
        const [profileId, construction, minGsm, maxGsm, width, yarn] = parameters ?? [];
        const profile = (profiles.get(schemaName) ?? []).find((row) => row.id === String(profileId));
        if (!profile) throw new Error(`factory_profile_id ${String(profileId)} is not in ${schemaName}`);
        const blends = typeof yarn === "string" ? (JSON.parse(yarn) as string[]) : (yarn as string[]);
        const row: CapabilityRow = {
          id: randomUUID(),
          factory_profile_id: profile.id,
          construction_type: String(construction),
          min_gsm: Number(minGsm),
          max_gsm: Number(maxGsm),
          max_usable_width_cm: Number(width),
          yarn_feed_compatibility: blends,
          version: versionDefault("fruma_loom_capabilities"),
        };
        const rows = capabilities.get(schemaName) ?? [];
        rows.push(row);
        capabilities.set(schemaName, rows);
        return [{ id: row.id, version: row.version }];
      }
      if (query.includes("FROM fruma_factory_profiles") && query.includes("fruma_loom_capabilities")) {
        const millOrgId = String(parameters?.[0] ?? "");
        const joined: MachineProfile[] = [];
        for (const profile of profiles.get(schemaName) ?? []) {
          if (profile.mill_org_id !== millOrgId) continue;
          for (const capability of capabilities.get(schemaName) ?? []) {
            if (capability.factory_profile_id !== profile.id) continue;
            joined.push({
              id: profile.id,
              mill_org_id: profile.mill_org_id,
              facility_name: profile.facility_name,
              country_location: profile.country_location,
              active_loom_count: profile.active_loom_count,
              profile_version: profile.version,
              is_active: profile.is_active,
              capability_id: capability.id,
              factory_profile_id: capability.factory_profile_id,
              construction_type: capability.construction_type,
              min_gsm: capability.min_gsm,
              max_gsm: capability.max_gsm,
              max_usable_width_cm: capability.max_usable_width_cm,
              yarn_feed_compatibility: capability.yarn_feed_compatibility,
              capability_version: capability.version,
            });
          }
        }
        return joined;
      }
      throw new Error(`Unexpected factory profile query: ${query}`);
    },
    async close() {},
  };
}

async function openSession(surface: FrumaVersion): Promise<SchemaSession> {
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

async function resetFactorySchema(surface: FrumaVersion): Promise<void> {
  await getSpineStore(surface).reset();
  const schema = ledgerSchemaName(surface);
  profiles.delete(schema);
  capabilities.delete(schema);
}

function yarnFeeds(value: unknown): string[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  assert.ok(Array.isArray(parsed));
  return parsed.map((item) => String(item));
}

function machineProfile(row: Record<string, unknown>): MachineProfile {
  return {
    id: String(row.id),
    mill_org_id: String(row.mill_org_id),
    facility_name: String(row.facility_name),
    country_location: String(row.country_location),
    active_loom_count: Number(row.active_loom_count),
    profile_version: Number(row.profile_version),
    is_active: row.is_active === true,
    capability_id: String(row.capability_id),
    factory_profile_id: String(row.factory_profile_id),
    construction_type: String(row.construction_type),
    min_gsm: Number(row.min_gsm),
    max_gsm: Number(row.max_gsm),
    max_usable_width_cm: Number(row.max_usable_width_cm),
    yarn_feed_compatibility: yarnFeeds(row.yarn_feed_compatibility),
    capability_version: Number(row.capability_version),
  };
}

describe("factory machine profiles", { concurrency: 1 }, () => {
  afterEach(() => {
    profiles.clear();
    capabilities.clear();
    setSpineStoreForTests(null);
    assertWorkspaceDataDirUntouched();
  });

  it("stores a versioned loom capability in fruma_test and hides it from fruma_demo", async () => {
    assert.equal(ledgerSchemaName("test"), "fruma_test");
    assert.equal(ledgerSchemaName("demo"), "fruma_demo");
    assert.equal(dropSchemaStatement("test"), "DROP SCHEMA IF EXISTS fruma_test CASCADE;");
    assert.equal(searchPathStatement("test"), "SET search_path TO fruma_test;");
    assert.equal(searchPathStatement("demo"), "SET search_path TO fruma_demo;");
    assert.equal(versionDefault("fruma_factory_profiles"), 1);
    assert.equal(versionDefault("fruma_loom_capabilities"), 1);
    assert.equal(profileActiveDefault(), true);
    assertWorkspaceDataDirUntouched();

    const schemas = installDiskFreeSchemas();
    const sessions: SchemaSession[] = [];
    try {
      await resetFactorySchema("demo");
      await resetFactorySchema("test");
      assert.equal(schemas.test, getSpineStore("test"));
      assert.equal(schemas.demo, getSpineStore("demo"));
      assertWorkspaceDataDirUntouched();

      const testSession = await openSession("test");
      const demoSession = await openSession("demo");
      sessions.push(testSession, demoSession);
      await testSession.unsafe(searchPathStatement("test"));
      await demoSession.unsafe(searchPathStatement("demo"));

      const testSchema = await testSession.unsafe(`SELECT current_schema() AS schema_name`);
      const demoSchema = await demoSession.unsafe(`SELECT current_schema() AS schema_name`);
      assert.equal(String(testSchema[0]?.schema_name), "fruma_test");
      assert.equal(String(demoSchema[0]?.schema_name), "fruma_demo");

      const empty = await testSession.unsafe(LOOKUP_PROFILE, [MILL_ORG_ID]);
      assert.deepEqual(empty, []);
      assertWorkspaceDataDirUntouched();

      const inserted = await testSession.unsafe(INSERT_PROFILE, [
        MILL_ORG_ID,
        FACILITY_NAME,
        COUNTRY,
        LOOM_COUNT,
      ]);
      const profileId = String(inserted[0]?.id);
      assert.match(profileId, /^[0-9a-f-]{36}$/);
      assert.equal(Number(inserted[0]?.version), 1);
      assert.equal(inserted[0]?.is_active, true);

      const capability = await testSession.unsafe(INSERT_CAPABILITY, [
        profileId,
        CONSTRUCTION,
        MIN_GSM,
        MAX_GSM,
        WIDTH_CM,
        JSON.stringify(YARN_FEEDS),
      ]);
      assert.match(String(capability[0]?.id), /^[0-9a-f-]{36}$/);
      assert.equal(Number(capability[0]?.version), 1);
      assertWorkspaceDataDirUntouched();

      const loaded = (await testSession.unsafe(LOOKUP_PROFILE, [MILL_ORG_ID])).map(machineProfile);
      assert.equal(loaded.length, 1);
      const row = loaded[0];
      assert.ok(row);
      assert.equal(row.id, profileId);
      assert.equal(row.mill_org_id, MILL_ORG_ID);
      assert.equal(row.facility_name, FACILITY_NAME);
      assert.equal(row.country_location, COUNTRY);
      assert.equal(row.active_loom_count, LOOM_COUNT);
      assert.equal(row.profile_version, 1);
      assert.equal(row.is_active, true);
      assert.equal(row.factory_profile_id, profileId);
      assert.equal(row.capability_id, String(capability[0]?.id));
      assert.equal(row.construction_type, CONSTRUCTION);
      assert.equal(row.min_gsm, MIN_GSM);
      assert.equal(row.max_gsm, MAX_GSM);
      assert.equal(row.max_usable_width_cm, WIDTH_CM);
      assert.deepEqual(row.yarn_feed_compatibility, YARN_FEEDS);
      assert.equal(row.capability_version, 1);
      assertWorkspaceDataDirUntouched();

      const hidden = await demoSession.unsafe(LOOKUP_PROFILE, [MILL_ORG_ID]);
      assert.deepEqual(hidden, []);
      const stillThere = await testSession.unsafe(LOOKUP_PROFILE, [MILL_ORG_ID]);
      assert.equal(stillThere.length, 1);
      assert.equal(String(stillThere[0]?.mill_org_id), MILL_ORG_ID);
      assertWorkspaceDataDirUntouched();
    } finally {
      for (const session of sessions) await session.close();
      schemas.close();
      profiles.clear();
      capabilities.clear();
      assertWorkspaceDataDirUntouched();
    }
  });
});
