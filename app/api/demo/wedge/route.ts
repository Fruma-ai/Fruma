import { requireTestFounder, testJson } from "@/lib/fruma/intelligence/http-auth";
import { DEMO_SURFACE } from "@/lib/fruma/surfaces";
import { getSpineStore, spineBackendKind } from "@/lib/fruma/persist";
import {
  answerDemoCase,
  askMill,
  emptyDemoCase,
  getDemoCase,
  lockDemoCase,
  resetDemoCase,
  sourceCloth,
} from "@/lib/fruma/wedge";

export const runtime = "nodejs";

/**
 * Demo case. Each action is one decision:
 * source (cite cloth) → ask (brand) → answer (mill) → lock (brand).
 * Searching does not confirm commercials or lock product truth.
 */
export async function GET(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to view the case." }, 401);
  const snap = await getSpineStore(DEMO_SURFACE).load();
  return testJson({
    case: getDemoCase(DEMO_SURFACE),
    persistence: { backend: spineBackendKind() },
    counts: {
      headerMaps: snap.headerMaps.length,
      requests: snap.requests.length,
      confirmations: snap.confirmations.length,
      productTruth: snap.productTruth.length,
      deposits: snap.deposits.length,
    },
  });
}

type CaseBody = {
  action?: "source" | "ask" | "answer" | "lock" | "reset";
  articleCode?: string;
  moqM?: number;
  leadWeeks?: number;
  available?: boolean;
  colour?: string | null;
  intent?: string;
  productName?: string;
};

export async function POST(request: Request) {
  const who = await requireTestFounder(request);
  if (!who) return testJson({ error: "Sign in to work the case." }, 401);

  let body: CaseBody = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as CaseBody;
    }
  } catch {
    body = {};
  }

  try {
    if (body.action === "reset") {
      return testJson({ case: await resetDemoCase(DEMO_SURFACE) });
    }
    if (body.action === "source") {
      const colour = typeof body.colour === "string" && body.colour.trim() === "" ? null : body.colour;
      return testJson({
        case: await sourceCloth({
          surface: DEMO_SURFACE,
          colour,
          intent: body.intent,
          productName: body.productName,
        }),
      });
    }
    if (body.action === "ask") {
      if (!body.articleCode?.trim()) {
        return testJson({ error: "Choose a cloth before asking the mill.", case: getDemoCase(DEMO_SURFACE) }, 400);
      }
      return testJson({ case: await askMill({ surface: DEMO_SURFACE, articleCode: body.articleCode }) });
    }
    if (body.action === "answer") {
      return testJson({
        case: await answerDemoCase({
          surface: DEMO_SURFACE,
          moqM: Number(body.moqM),
          leadWeeks: Number(body.leadWeeks),
          available: body.available,
        }),
      });
    }
    if (body.action === "lock") {
      return testJson({ case: await lockDemoCase({ surface: DEMO_SURFACE }) });
    }
    return testJson(
      {
        error: "Choose an action: source, ask, answer, or lock.",
        case: getDemoCase(DEMO_SURFACE) ?? emptyDemoCase(),
      },
      400,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "case_failed";
    return testJson({ error: message, case: getDemoCase(DEMO_SURFACE) }, 400);
  }
}
