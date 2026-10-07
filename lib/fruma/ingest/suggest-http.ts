import { DEMO_COOKIE } from "../../gate";
import { requireTestFounder } from "../intelligence/http-auth";
import { getPostgresPool, type PinnedLedgerClient } from "../persist/postgres-store";
import { isFrumaVersion, type FrumaVersion } from "../versions";
import { acceptStagedSuggestions, type AcceptedSuggestion } from "./accept-staged-suggestions";

export type AcceptStagedSuggestionsBody = {
  success: true;
  depositId: string;
  accepted: AcceptedSuggestion[];
};

export type AcceptStagedSuggestionsHttpResult =
  | { status: 200; surface: FrumaVersion; body: AcceptStagedSuggestionsBody }
  | {
      status: 400;
      surface: FrumaVersion | null;
      body: { error: "invalid_environment_surface" | "missing_selected_cells" };
    }
  | { status: 401; surface: FrumaVersion | null; body: { error: "unauthorized_operator" } }
  | { status: 500; surface: FrumaVersion; body: { error: "internal_ledger_execution_failure" } };

function versionFromHeader(request: Request): FrumaVersion | "invalid" {
  const raw = request.headers.get("x-fruma-version");
  if (!raw) return "demo";
  return isFrumaVersion(raw) ? raw : "invalid";
}

function founderCookie(request: Request): string {
  const header = request.headers.get("cookie");
  if (!header) return "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== DEMO_COOKIE) continue;
    return part.slice(eq + 1).trim();
  }
  return "";
}

function readSelection(
  body: unknown,
): { depositId: string; selectedCellIds: string[] } | { error: "missing_selected_cells" } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "missing_selected_cells" };
  }
  const record = body as { depositId?: unknown; selectedCellIds?: unknown };
  const depositId = typeof record.depositId === "string" ? record.depositId.trim() : "";
  if (!depositId || !Array.isArray(record.selectedCellIds) || record.selectedCellIds.length === 0) {
    return { error: "missing_selected_cells" };
  }
  const selectedCellIds: string[] = [];
  for (const cellId of record.selectedCellIds) {
    if (typeof cellId !== "string" || !cellId.trim()) return { error: "missing_selected_cells" };
    selectedCellIds.push(cellId);
  }
  return { depositId, selectedCellIds };
}

/**
 * Founder session required. The pool is the schema for x-fruma-version.
 * Branch B accepts the selected staged proposals by appending confirm events.
 */
export async function handleAcceptStagedSuggestionsRequest(
  request: Request,
): Promise<AcceptStagedSuggestionsHttpResult> {
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

  const operatorCookie = founderCookie(request);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { status: 400, surface: version, body: { error: "missing_selected_cells" } };
  }
  const selection = readSelection(payload);
  if ("error" in selection) {
    return { status: 400, surface: version, body: { error: selection.error } };
  }

  let client: PinnedLedgerClient | undefined;
  try {
    const pool = getPostgresPool(version);
    client = await pool.connect();
    const accepted = await acceptStagedSuggestions(
      client,
      selection.depositId,
      selection.selectedCellIds,
      operatorCookie,
    );
    return {
      status: 200,
      surface: version,
      body: { success: true, depositId: selection.depositId, accepted },
    };
  } catch {
    return { status: 500, surface: version, body: { error: "internal_ledger_execution_failure" } };
  } finally {
    client?.release();
  }
}
