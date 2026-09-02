import { DEMO_COOKIE, sessionFounder } from "../../gate";
import { toMillDepositResponse, type MillDepositResponse } from "../mill-deposit";
import { IngestEngine } from "./engine";
import { isIngestException } from "./exceptions";

/** Authenticated founder session maps here. Never Vale do Ave / body mill-org. */
export const SYNTHETIC_MILL_ORG_ID = "org_mill_synthetic";

let engine: IngestEngine | undefined;

function millIngestEngine(): IngestEngine {
  engine ??= new IngestEngine();
  return engine;
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
  | { status: 200; body: MillDepositResponse }
  | { status: 401; body: { error: string } }
  | { status: 400; body: { code: string; message: string } | { error: string } };

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

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const result = millIngestEngine().deposit({
      supplierOrgId: SYNTHETIC_MILL_ORG_ID,
      filename: file.name,
      bytes,
    });
    return {
      status: 200,
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
