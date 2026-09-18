import { requireFounder } from "@/lib/fruma/agents/http-auth";
import { latestAgentRun, runMultiBrandIntelligence } from "@/lib/fruma/agents";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to view multi-brand results." }, { status: 401 });
  }
  return Response.json({ surface: TEST_SURFACE, run: latestAgentRun("match") ?? null });
}

export async function POST(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to run multi-brand intelligence." }, { status: 401 });
  }

  const run = runMultiBrandIntelligence({
    idempotencyKey: `multi-brand:manual:${Date.now()}`,
  });

  return Response.json(
    { surface: TEST_SURFACE, run },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Fruma-Version": TEST_SURFACE },
    },
  );
}
