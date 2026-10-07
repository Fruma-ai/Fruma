import type { Client } from "../persist/reload-engines";
import { searchPathStatement } from "../persist/postgres-schema";
import { isFrumaVersion } from "../versions";

/**
 * One unfulfilled fabric brief this mill can already manufacture.
 * The payload names the weight, the width, and how many independent searches hit that gap.
 * It carries no brand identity.
 */
export type MarketOpportunity = {
  target_gsm: number;
  target_width: number;
  unfulfilled_search_volume: number;
};

type LoomBounds = {
  minGsm: number;
  maxGsm: number;
  maxWidthCm: number;
  fibers: string[];
};

type FailedSearch = {
  searchId: string;
  gsm: number;
  widthCm: number;
  fibers: string[];
};

const CAPABILITY_SQL = `
  SELECT
    c.min_gsm,
    c.max_gsm,
    c.max_usable_width_cm,
    c.yarn_feed_compatibility
  FROM fruma_factory_profiles p
  INNER JOIN fruma_loom_capabilities c ON c.factory_profile_id = p.id
  WHERE p.mill_org_id = $1
    AND p.is_active = TRUE
    AND p.version = (
      SELECT MAX(version)
      FROM fruma_factory_profiles
      WHERE mill_org_id = $1
        AND is_active = TRUE
    )
`;

const ZERO_RESULT_SQL = `
  SELECT
    search_id,
    requested_gsm,
    requested_width_cm,
    requested_fibers
  FROM fruma_search_telemetry
  WHERE result_count = 0
`;

async function pinSearchPath(client: Client): Promise<void> {
  const schemaRows = await client.unsafe(`SELECT current_schema() AS schema_name`);
  const schemaName = String(schemaRows[0]?.schema_name ?? "");
  const version = schemaName.startsWith("fruma_") ? schemaName.slice("fruma_".length) : "";
  if (!isFrumaVersion(version)) {
    throw new Error(`search_path schema ${schemaName || "(none)"} is not a Fruma ledger schema`);
  }
  await client.unsafe(searchPathStatement(version));
}

function fiberList(value: unknown): string[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) return [];
  const fibers: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const name = item.trim().toLowerCase();
    if (name && !fibers.includes(name)) fibers.push(name);
  }
  return fibers;
}

function wholeNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number)) return null;
  return number;
}

function loomFromRow(row: Record<string, unknown>): LoomBounds | null {
  const minGsm = wholeNumber(row.min_gsm);
  const maxGsm = wholeNumber(row.max_gsm);
  const maxWidthCm = wholeNumber(row.max_usable_width_cm);
  if (minGsm == null || maxGsm == null || maxWidthCm == null) return null;
  if (minGsm < 0 || maxGsm < minGsm || maxWidthCm <= 0) return null;
  const fibers = fiberList(row.yarn_feed_compatibility);
  if (fibers.length === 0) return null;
  return { minGsm, maxGsm, maxWidthCm, fibers };
}

function failedSearchFromRow(row: Record<string, unknown>): FailedSearch | null {
  const searchId = String(row.search_id ?? "").trim();
  const gsm = wholeNumber(row.requested_gsm);
  const widthCm = wholeNumber(row.requested_width_cm);
  if (!searchId || gsm == null || widthCm == null) return null;
  if (gsm < 0 || widthCm <= 0) return null;
  const fibers = fiberList(row.requested_fibers);
  if (fibers.length === 0) return null;
  return { searchId, gsm, widthCm, fibers };
}

function loomCovers(loom: LoomBounds, search: FailedSearch): boolean {
  if (search.gsm < loom.minGsm || search.gsm > loom.maxGsm) return false;
  if (search.widthCm > loom.maxWidthCm) return false;
  return search.fibers.every((fiber) => loom.fibers.includes(fiber));
}

function millCanMake(looms: readonly LoomBounds[], search: FailedSearch): boolean {
  return looms.some((loom) => loomCovers(loom, search));
}

/**
 * Count designer searches that returned nothing and still fit this mill's looms.
 * The connection's current schema is pinned before either read. Both queries use
 * unqualified tables, so they stay inside that search path. Telemetry rows are
 * anonymous: the select list is the search id, the requested weight, width, and fibers.
 */
export async function calculateFactoryMarketOpportunities(
  client: Client,
  millOrgId: string,
): Promise<MarketOpportunity[]> {
  const mill = millOrgId.trim();
  if (!mill) throw new Error("mill_org_required");

  await pinSearchPath(client);

  const capabilityRows = await client.unsafe(CAPABILITY_SQL, [mill]);
  const looms = capabilityRows.flatMap((row) => {
    const loom = loomFromRow(row);
    return loom ? [loom] : [];
  });
  if (looms.length === 0) return [];

  const telemetryRows = await client.unsafe(ZERO_RESULT_SQL);
  const groups = new Map<string, { gsm: number; width: number; searchIds: Set<string> }>();
  for (const row of telemetryRows) {
    if ("result_count" in row && Number(row.result_count) !== 0) continue;
    const search = failedSearchFromRow(row);
    if (!search || !millCanMake(looms, search)) continue;
    const key = `${search.gsm}\0${search.widthCm}`;
    const group = groups.get(key) ?? { gsm: search.gsm, width: search.widthCm, searchIds: new Set<string>() };
    group.searchIds.add(search.searchId);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      target_gsm: group.gsm,
      target_width: group.width,
      unfulfilled_search_volume: group.searchIds.size,
    }))
    .sort(
      (a, b) =>
        b.unfulfilled_search_volume - a.unfulfilled_search_volume ||
        a.target_gsm - b.target_gsm ||
        a.target_width - b.target_width,
    );
}
