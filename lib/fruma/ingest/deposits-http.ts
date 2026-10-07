import { DEMO_COOKIE, sessionFounder } from "../../gate";
import { toMillDepositResponse, type MillDepositResponse } from "../mill-deposit";
import type { DepositAuditRow } from "../persist";
import { getSpineStore } from "../persist";
import { DEMO_SURFACE, surfaceFromRequest, surfaceMillOrgId } from "../surfaces";
import type { FrumaVersion } from "../versions";
import { IngestEngine } from "./engine";
import { isIngestException } from "./exceptions";
import type { DepositResult } from "./types";

/** @deprecated Prefer surfaceMillOrgId("demo"). Kept for existing deposit tests. */
export const SYNTHETIC_MILL_ORG_ID = surfaceMillOrgId(DEMO_SURFACE);

const engines = new Map<FrumaVersion, IngestEngine>();

export function millIngestEngineFor(surface: FrumaVersion): IngestEngine {
  let engine = engines.get(surface);
  if (!engine) {
    engine = new IngestEngine();
    engines.set(surface, engine);
  }
  return engine;
}

/** Test helper — clear partitioned engines between cases when needed. */
export function resetMillIngestEnginesForTests() {
  engines.clear();
}

function cookieNamed(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

export type MillDepositHttpResult =
  | {
      status: 200;
      body: MillDepositResponse;
      surface: FrumaVersion;
      result: DepositResult;
      bytes: Uint8Array;
    }
  | { status: 401; body: { error: string } }
  | { status: 400; body: { code: string; message: string } | { error: string } };

export type MillDepositsAuditHttpResult =
  | { status: 200; surface: FrumaVersion; body: DepositAuditRow[] }
  | { status: 401; surface: FrumaVersion; body: { error: string } };

const AUDIT_COLUMNS = ["id", "filename", "byte_hash", "supplier_org_id", "received_at"] as const;

function auditPayload(rows: readonly DepositAuditRow[]): DepositAuditRow[] {
  return rows.map((row) => {
    if ("bytes" in row || row instanceof Uint8Array) {
      throw new Error("Mill deposit audit included file bytes.");
    }
    const clean: DepositAuditRow = {
      id: row.id,
      filename: row.filename,
      byte_hash: row.byte_hash,
      supplier_org_id: row.supplier_org_id,
      received_at: row.received_at,
    };
    const keys = Object.keys(clean);
    if (keys.length !== AUDIT_COLUMNS.length || AUDIT_COLUMNS.some((column) => !keys.includes(column))) {
      throw new Error("Mill deposit audit included a column outside the tracking set.");
    }
    return clean;
  });
}

/** Audit trail of factory catalogs on the active schema search path. */
export async function handleMillDepositsAuditRequest(
  request: Request,
): Promise<MillDepositsAuditHttpResult> {
  const surface = surfaceFromRequest(request);
  const who = await sessionFounder(cookieNamed(request, DEMO_COOKIE));
  if (!who) {
    return { status: 401, surface, body: { error: "Sign in to read mill deposits." } };
  }
  const rows = await getSpineStore(surface).listDepositAudit();
  return { status: 200, surface, body: auditPayload(rows) };
}

export async function handleMillDepositRequest(request: Request): Promise<MillDepositHttpResult> {
  const who = await sessionFounder(cookieNamed(request, DEMO_COOKIE));
  if (!who) {
    return { status: 401, body: { error: "Sign in to deposit a mill file." } };
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { status: 400, body: { error: "Could not read the file." } };
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return { status: 400, body: { error: "Attach a mill file as multipart field file." } };
  }

  const surface = surfaceFromRequest(request, form.get("frumaVersion"));
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const result = millIngestEngineFor(surface).deposit({
      supplierOrgId: surfaceMillOrgId(surface),
      filename: file.name,
      bytes,
    });
    return {
      status: 200,
      surface,
      result,
      bytes,
      body: toMillDepositResponse({
        depositId: result.deposit.depositId,
        filename: result.deposit.filename,
        receivedAt: result.deposit.receivedAt,
        sha256: result.deposit.sha256,
        qualities: result.qualities.map((q) => ({
          baseQualityId: q.id,
          millArticleCode: q.millArticleCode,
          colourwayIds: q.colourways.map((c) => c.id),
        })),
        exceptions: result.exceptions.map((e) => ({
          code: e.code,
          message: e.message,
          sheet: e.pointer?.sheet,
          row: e.pointer?.row,
          column: e.pointer?.column,
        })),
      }),
    };
  } catch (err) {
    if (isIngestException(err)) {
      return { status: 400, body: { code: err.code, message: err.message } };
    }
    throw err;
  }
}
