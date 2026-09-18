import { scoreCorpusCoverage } from "@/lib/fruma/intelligence/coverage";
import { requireTestFounder, testJson } from "@/lib/fruma/intelligence/http-auth";
import { confirmedHeaderOverlays } from "@/lib/fruma/intelligence/overlays";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

/** Corpus health: searchable / partial / dark mills after confirmed overlays. */
export async function GET(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to view test coverage." }, 401);

  const overlays = confirmedHeaderOverlays(TEST_SURFACE);
  const coverage = scoreCorpusCoverage(overlays);
  return testJson({
    surface: TEST_SURFACE,
    overlays,
    coverage,
  });
}
