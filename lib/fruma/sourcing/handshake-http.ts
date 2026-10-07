import { requireTestFounder } from "../intelligence/http-auth";
import { getPostgresPool, type PinnedLedgerClient } from "../persist/postgres-store";
import { isFrumaVersion, type FrumaVersion } from "../versions";
import { initiateSourcingHandshake } from "./handshake";

const COMMERCIAL_TARGET_FIELDS = new Set(["price", "moq", "lead_time"]);

export type SourcingHandshakeCreated = {
  success: true;
  requestId: string;
  status: "PENDING";
  timestamp: string;
};

export type SourcingHandshakeHttpResult =
  | { status: 201; surface: FrumaVersion; body: SourcingHandshakeCreated }
  | {
      status: 400;
      surface: FrumaVersion | null;
      body: {
        error:
          | "invalid_environment_surface"
          | "missing_mandatory_handshake_parameters"
          | "invalid_commercial_target_field";
      };
    }
  | { status: 401; surface: FrumaVersion | null; body: { error: "unauthorized_operator" } }
  | { status: 500; surface: FrumaVersion; body: { error: "internal_ledger_execution_failure" } };

function versionFromHeader(request: Request): FrumaVersion | "invalid" {
  const raw = request.headers.get("x-fruma-version");
  if (!raw) return "demo";
  return isFrumaVersion(raw) ? raw : "invalid";
}

function readParameters(
  body: unknown,
):
  | { qualityId: string; targetFields: string[]; brandOrgId: string }
  | { error: "missing_mandatory_handshake_parameters" | "invalid_commercial_target_field" } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "missing_mandatory_handshake_parameters" };
  }
  const record = body as { qualityId?: unknown; targetFields?: unknown; brandOrgId?: unknown };
  const qualityId = typeof record.qualityId === "string" ? record.qualityId.trim() : "";
  const brandOrgId = typeof record.brandOrgId === "string" ? record.brandOrgId.trim() : "";
  const targetFields = record.targetFields;
  if (!qualityId || !brandOrgId || !Array.isArray(targetFields) || targetFields.length === 0) {
    return { error: "missing_mandatory_handshake_parameters" };
  }
  const fields: string[] = [];
  for (const field of targetFields) {
    if (typeof field !== "string" || !COMMERCIAL_TARGET_FIELDS.has(field)) {
      return { error: "invalid_commercial_target_field" };
    }
    fields.push(field);
  }
  return { qualityId, targetFields: fields, brandOrgId };
}

/**
 * Founder session required. The pool is the schema for x-fruma-version.
 * The JSON body names the request id and timestamp. It does not name the brand.
 */
export async function handleSourcingHandshakeRequest(request: Request): Promise<SourcingHandshakeHttpResult> {
  const version = versionFromHeader(request);
  const who = await requireTestFounder(request);
  if (!who) {
    return {
      status: 401,
      surface: version === "invalid" ? null : version,
      body: { error: "unauthorized_operator" },
    };
  }
  if (version === "invalid") {
    return { status: 400, surface: null, body: { error: "invalid_environment_surface" } };
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { status: 400, surface: version, body: { error: "missing_mandatory_handshake_parameters" } };
  }
  const parameters = readParameters(payload);
  if ("error" in parameters) {
    return { status: 400, surface: version, body: { error: parameters.error } };
  }

  let client: PinnedLedgerClient | undefined;
  try {
    const pool = getPostgresPool(version);
    client = await pool.connect();
    const result = await initiateSourcingHandshake(
      client,
      parameters.brandOrgId,
      parameters.qualityId,
      parameters.targetFields,
    );
    return {
      status: 201,
      surface: version,
      body: {
        success: true,
        requestId: result.request_id,
        status: "PENDING",
        timestamp: result.implementedAt,
      },
    };
  } catch {
    return { status: 500, surface: version, body: { error: "internal_ledger_execution_failure" } };
  } finally {
    client?.release();
  }
}
