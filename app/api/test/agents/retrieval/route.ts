import { requireFounder } from "@/lib/fruma/agents/http-auth";
import { latestAgentRun, runRetrievalAgent } from "@/lib/fruma/agents";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to view retrieval results." }, { status: 401 });
  }
  return Response.json({ surface: TEST_SURFACE, run: latestAgentRun("retrieval") ?? null });
}

export async function POST(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to run the Retrieval agent." }, { status: 401 });
  }

  let body: { productId?: string; brandId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const run = runRetrievalAgent({
    productId: body.productId,
    brandId: body.brandId ?? "brand-northline",
    idempotencyKey: `retrieval:manual:${Date.now()}`,
  });

  return Response.json(
    { surface: TEST_SURFACE, run },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Fruma-Version": TEST_SURFACE },
    },
  );
}
