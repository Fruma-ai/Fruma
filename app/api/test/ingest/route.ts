import { confirmedHeaderOverlays } from "@/lib/fruma/agents/confirmed-headers";
import { factoryById, hangerCsvFor } from "@/lib/fruma/test-corpus";
import { runCorpusHarness } from "@/lib/fruma/test-corpus/harness";
import { millIngestEngineFor } from "@/lib/fruma/ingest/deposits-http";
import { toMillDepositResponse } from "@/lib/fruma/mill-deposit";
import { requireTestFounder, testJson } from "@/lib/fruma/intelligence/http-auth";
import { scoreFactoryCoverage } from "@/lib/fruma/intelligence/coverage";
import { surfaceMillOrgId, TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

/**
 * Test-only ingest: run one corpus factory hanger — or the full fifty-factory
 * harness — through the Test ingest engine. Never writes to the Demo engine.
 *
 * Body: `{ factoryId }` or `{ all: true }` for the corpus harness.
 * Mapping-agent confirmed overlays are applied on both paths.
 */
export async function POST(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) {
    return testJson({ error: "Sign in to run test ingest." }, 401);
  }

  let body: { factoryId?: string; all?: boolean };
  try {
    body = (await request.json()) as { factoryId?: string; all?: boolean };
  } catch {
    return Response.json(
      { error: "Expected JSON body with factoryId or { all: true }." },
      { status: 400 },
    );
  }

  if (body.all === true) {
    const harness = runCorpusHarness({
      headerOverlays: confirmedHeaderOverlays(TEST_SURFACE),
    });
    return testJson({ surface: TEST_SURFACE, harness });
  }

  const factoryId = body.factoryId?.trim();
  if (!factoryId) {
    return Response.json(
      { error: "factoryId is required (or pass { all: true } for the corpus harness)." },
      { status: 400 },
    );
  }

  const factory = factoryById(factoryId);
  if (!factory) {
    return Response.json({ error: "unknown_factory" }, { status: 404 });
  }

  const csv = hangerCsvFor(factory);
  const bytes = new TextEncoder().encode(csv);

  try {
    const overlays = confirmedHeaderOverlays(TEST_SURFACE);
    const result = millIngestEngineFor(TEST_SURFACE).deposit({
      supplierOrgId: surfaceMillOrgId(TEST_SURFACE),
      filename: factory.filename,
      bytes,
      headerOverlays: overlays,
    });
    const coverage = scoreFactoryCoverage(factory, overlays);
    const unmappedHeaders = [
      ...new Set(result.cells.filter((c) => !c.standardField && c.header.trim()).map((c) => c.header)),
    ].sort();

    return testJson({
      surface: TEST_SURFACE,
      factoryId: factory.id,
      factoryName: factory.name,
      dialect: factory.dialect,
      coverage,
      unmappedHeaders,
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest_failed";
    return testJson({ error: message }, 400);
  }
}
