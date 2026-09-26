import { requireTestFounder, testJson } from "@/lib/fruma/intelligence/http-auth";
import {
  answerMillRequest,
  createAnonymousMillRequest,
  millViewOfRequest,
} from "@/lib/fruma/confirm";
import { getSpineStore } from "@/lib/fruma/persist";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

/** List open/answered anonymous mill requests (brand side — founder Test only). */
export async function GET(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to view confirmations." }, 401);
  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "brand";
  const snap = await getSpineStore(TEST_SURFACE).load();
  if (view === "mill") {
    return testJson({
      surface: TEST_SURFACE,
      requests: snap.requests.map(millViewOfRequest),
      confirmations: snap.confirmations,
    });
  }
  return testJson({
    surface: TEST_SURFACE,
    requests: snap.requests,
    confirmations: snap.confirmations,
  });
}

/**
 * Create an anonymous request or answer one as the mill.
 * Body: { action: "request", ... } | { action: "answer", ... }
 */
export async function POST(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to confirm." }, 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return testJson({ error: "Expected JSON body." }, 400);
  }

  try {
    if (body.action === "request") {
      const created = await createAnonymousMillRequest({
        brandId: String(body.brandId ?? ""),
        productId: String(body.productId ?? ""),
        millOrgId: String(body.millOrgId ?? ""),
        qualityArticle: String(body.qualityArticle ?? ""),
        millVisible: {
          category: String((body.millVisible as { category?: string } | undefined)?.category ?? ""),
          colour: (body.millVisible as { colour?: string } | undefined)?.colour,
          requestedMoqHint: (body.millVisible as { requestedMoqHint?: string } | undefined)
            ?.requestedMoqHint,
          deliveryRegion: String(
            (body.millVisible as { deliveryRegion?: string } | undefined)?.deliveryRegion ?? "UK/EU",
          ),
        },
      });
      return testJson({
        request: created,
        millVisible: millViewOfRequest(created),
      });
    }

    if (body.action === "answer") {
      const result = await answerMillRequest({
        requestId: String(body.requestId ?? ""),
        millOrgId: String(body.millOrgId ?? ""),
        moqM: Number(body.moqM),
        leadWeeks: Number(body.leadWeeks),
        available: body.available !== false,
        note: body.note ? String(body.note) : undefined,
      });
      return testJson(result);
    }

    return testJson({ error: "action must be request or answer" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "confirm_failed";
    return testJson({ error: message }, 400);
  }
}
