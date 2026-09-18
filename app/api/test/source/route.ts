import { requireTestFounder, testJson } from "@/lib/fruma/intelligence/http-auth";
import { confirmedHeaderOverlays } from "@/lib/fruma/intelligence/overlays";
import { sourceShortlist, tenantIsolationProof } from "@/lib/fruma/intelligence/retrieval";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to run test source." }, 401);

  let body: { brandId?: string; productId?: string; priorFactoryIds?: string[] };
  try {
    body = (await request.json()) as {
      brandId?: string;
      productId?: string;
      priorFactoryIds?: string[];
    };
  } catch {
    return testJson({ error: "Expected JSON body with brandId and productId." }, 400);
  }

  const brandId = body.brandId?.trim();
  const productId = body.productId?.trim();
  if (!brandId || !productId) {
    return testJson({ error: "brandId and productId are required." }, 400);
  }

  try {
    const shortlist = sourceShortlist({
      brandId,
      productId,
      overlays: confirmedHeaderOverlays(TEST_SURFACE),
      priorFactoryIds: Array.isArray(body.priorFactoryIds) ? body.priorFactoryIds : [],
    });
    return testJson({
      surface: TEST_SURFACE,
      isolation: tenantIsolationProof(),
      shortlist,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "source_failed";
    return testJson({ error: message }, 400);
  }
}
