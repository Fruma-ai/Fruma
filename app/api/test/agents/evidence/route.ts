import { requireFounder } from "@/lib/fruma/agents/http-auth";
import { latestAgentRun, runEvidenceAgent } from "@/lib/fruma/agents";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to view evidence results." }, { status: 401 });
  }
  return Response.json({ surface: TEST_SURFACE, run: latestAgentRun("evidence") ?? null });
}

export async function POST(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to run the Evidence agent." }, { status: 401 });
  }

  let body: { brandId?: string; refreshRetrieval?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const run = runEvidenceAgent({
    brandId: body.brandId ?? "brand-northline",
    refreshRetrieval: body.refreshRetrieval ?? true,
    idempotencyKey: `evidence:manual:${Date.now()}`,
  });

  return Response.json(
    { surface: TEST_SURFACE, run },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Fruma-Version": TEST_SURFACE },
    },
  );
}
