import { DEMO_COOKIE, sessionFounder } from "@/lib/gate";
import { confirmedHeaderOverlays } from "@/lib/fruma/agents/confirmed-headers";
import { factoryById, hangerCsvFor } from "@/lib/fruma/test-corpus";
import { millIngestEngineFor } from "@/lib/fruma/ingest/deposits-http";
import { toMillDepositResponse } from "@/lib/fruma/mill-deposit";
import { surfaceMillOrgId, TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

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

/**
 * Test-only ingest: run a corpus factory hanger through the Test ingest engine.
 * Never writes to the Demo engine.
 */
export async function POST(request: Request) {
  const who = await sessionFounder(cookieNamed(request, DEMO_COOKIE));
  if (!who) {
    return Response.json({ error: "Sign in to run test ingest." }, { status: 401 });
  }

  let body: { factoryId?: string };
  try {
    body = (await request.json()) as { factoryId?: string };
  } catch {
    return Response.json({ error: "Expected JSON body with factoryId." }, { status: 400 });
  }

  const factoryId = body.factoryId?.trim();
  if (!factoryId) {
    return Response.json({ error: "factoryId is required." }, { status: 400 });
  }

  const factory = factoryById(factoryId);
  if (!factory) {
    return Response.json({ error: "unknown_factory" }, { status: 404 });
  }

  const csv = hangerCsvFor(factory);
  const bytes = new TextEncoder().encode(csv);

  try {
    const result = millIngestEngineFor(TEST_SURFACE).deposit({
      supplierOrgId: surfaceMillOrgId(TEST_SURFACE),
      filename: factory.filename,
      bytes,
      headerOverlays: confirmedHeaderOverlays(TEST_SURFACE),
    });

    return Response.json(
      {
        surface: TEST_SURFACE,
        factoryId: factory.id,
        factoryName: factory.name,
        dialect: factory.dialect,
        deposit: toMillDepositResponse({
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
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Fruma-Version": TEST_SURFACE,
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest_failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
