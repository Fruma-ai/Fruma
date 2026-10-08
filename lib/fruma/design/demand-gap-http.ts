import { requireTestFounder } from "../intelligence/http-auth";
import { getPostgresPool, type PinnedLedgerClient } from "../persist/postgres-store";
import { isFrumaVersion, type FrumaVersion } from "../versions";
import { calculateFactoryMarketOpportunities, type MarketOpportunity } from "./demand-gap";

export type FactoryMarketOpportunitiesBody = {
  success: true;
  millOrgId: string;
  opportunities: MarketOpportunity[];
  computedAt: string;
};

export type FactoryMarketOpportunitiesHttpResult =
  | { status: 200; surface: FrumaVersion; body: FactoryMarketOpportunitiesBody }
  | {
      status: 400;
      surface: FrumaVersion | null;
      body: { error: "missing_mandatory_mill_identifier" | "invalid_environment_surface" };
    }
  | { status: 401; surface: FrumaVersion | null; body: { error: "unauthorized_operator" } }
  | { status: 500; surface: FrumaVersion; body: { error: "internal_ledger_execution_failure" } };

function versionFromHeader(request: Request): FrumaVersion | "invalid" {
  const raw = request.headers.get("x-fruma-version");
  if (!raw) return "demo";
  return isFrumaVersion(raw) ? raw : "invalid";
}

function millOrgIdFromRequest(request: Request): string {
  return new URL(request.url).searchParams.get("millOrgId")?.trim() ?? "";
}

/**
 * Founder session required. The pool is the schema for x-fruma-version.
 * millOrgId selects that schema's loom bounds against anonymous zero-result searches.
 */
export async function handleFactoryMarketOpportunitiesRequest(
  request: Request,
): Promise<FactoryMarketOpportunitiesHttpResult> {
  const version = versionFromHeader(request);
  const who = await requireTestFounder(request);
  if (!who) {
    return {
      status: 401,
      surface: version === "invalid" ? null : version,
      body: { error: "unauthorized_operator" },
    };
  }

  const millOrgId = millOrgIdFromRequest(request);
  if (!millOrgId) {
    return {
      status: 400,
      surface: version === "invalid" ? null : version,
      body: { error: "missing_mandatory_mill_identifier" },
    };
  }
  if (version === "invalid") {
    return { status: 400, surface: null, body: { error: "invalid_environment_surface" } };
  }

  let client: PinnedLedgerClient | undefined;
  try {
    const pool = getPostgresPool(version);
    client = await pool.connect();
    const opportunities = await calculateFactoryMarketOpportunities(client, millOrgId);
    return {
      status: 200,
      surface: version,
      body: {
        success: true,
        millOrgId,
        opportunities,
        computedAt: new Date().toISOString(),
      },
    };
  } catch {
    return { status: 500, surface: version, body: { error: "internal_ledger_execution_failure" } };
  } finally {
    client?.release();
  }
}
