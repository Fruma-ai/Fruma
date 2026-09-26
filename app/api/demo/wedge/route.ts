import { requireTestFounder, testJson } from "@/lib/fruma/intelligence/http-auth";
import { DEMO_SURFACE } from "@/lib/fruma/surfaces";
import { getSpineStore, spineBackendKind } from "@/lib/fruma/persist";
import { resetWedgeForTests, runWedgeSlice } from "@/lib/fruma/wedge";

export const runtime = "nodejs";

/**
 * Promoted Demo wedge — same spine as Test, partitioned under DEMO_SURFACE.
 * Does not touch the fifty-factory Test corpus.
 */
export async function GET(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to view the Demo wedge." }, 401);
  const snap = await getSpineStore(DEMO_SURFACE).load();
  return testJson({
    surface: DEMO_SURFACE,
    persistence: { backend: spineBackendKind() },
    counts: {
      headerMaps: snap.headerMaps.length,
      requests: snap.requests.length,
      confirmations: snap.confirmations.length,
      productTruth: snap.productTruth.length,
      deposits: snap.deposits.length,
    },
    honesty: "Promoted Demo spine. Fake catalogue enhancer removed.",
  });
}

export async function POST(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to run the Demo wedge." }, 401);

  let body: { reset?: boolean; moqM?: number; leadWeeks?: number } = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as { reset?: boolean; moqM?: number; leadWeeks?: number };
    }
  } catch {
    body = {};
  }

  if (body.reset) {
    await resetWedgeForTests();
  }

  try {
    const result = await runWedgeSlice({
      moqM: body.moqM,
      leadWeeks: body.leadWeeks,
      surface: DEMO_SURFACE,
    });
    return testJson(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "wedge_failed";
    return testJson({ error: message }, 400);
  }
}
