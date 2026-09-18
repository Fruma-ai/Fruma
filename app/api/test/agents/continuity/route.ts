import { requireFounder } from "@/lib/fruma/agents/http-auth";
import { latestAgentRun, runContinuityAgent } from "@/lib/fruma/agents";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to view continuity results." }, { status: 401 });
  }
  return Response.json({ surface: TEST_SURFACE, run: latestAgentRun("continuity") ?? null });
}

export async function POST(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to run the Continuity agent." }, { status: 401 });
  }

  let body: { refresh?: boolean; brandId?: string; allBrands?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const allBrands = body.allBrands === true || body.brandId === "__all__";

  const run = runContinuityAgent({
    refresh: body.refresh ?? true,
    brandId: allBrands ? undefined : (body.brandId ?? "brand-northline"),
    allBrands,
    idempotencyKey: allBrands
      ? `continuity:manual:all:${Date.now()}`
      : `continuity:manual:${body.brandId ?? "brand-northline"}:${Date.now()}`,
  });

  return Response.json(
    { surface: TEST_SURFACE, run },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Fruma-Version": TEST_SURFACE },
    },
  );
}
