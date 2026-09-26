import { requireTestFounder, testJson } from "@/lib/fruma/intelligence/http-auth";
import { resetHeaderOverlaysForTests } from "@/lib/fruma/intelligence/overlays";
import { resetPilotEngineForTests, runPilotSlice, pilotWorkbookShaHint } from "@/lib/fruma/pilot";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

/**
 * Test-only sellability slice:
 * realistic XLSX → ingest → confirm maps → shortlist with cell citations.
 * Never writes Demo.
 */
export async function GET(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to view the pilot slice." }, 401);
  return testJson({
    surface: TEST_SURFACE,
    hint: pilotWorkbookShaHint(),
    honesty:
      "Pilot fixture workbook shaped like a mill fabric book. Not a live customer file. Demo stays frozen.",
  });
}

export async function POST(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to run the pilot slice." }, 401);

  let body: { reset?: boolean } = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as { reset?: boolean };
    }
  } catch {
    body = {};
  }

  if (body.reset) {
    resetHeaderOverlaysForTests();
    resetPilotEngineForTests();
  }

  try {
    const result = runPilotSlice();
    return testJson(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "pilot_failed";
    return testJson({ error: message }, 400);
  }
}
