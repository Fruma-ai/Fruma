import { requireFounder } from "@/lib/fruma/agents/http-auth";
import { runCorpusHarness, latestAgentRun } from "@/lib/fruma/agents";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to view harness results." }, { status: 401 });
  }
  const run = latestAgentRun("ingest");
  return Response.json({ surface: TEST_SURFACE, run: run ?? null });
}

export async function POST(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to run the Corpus Harness agent." }, { status: 401 });
  }

  const run = runCorpusHarness({
    idempotencyKey: `corpus-harness:manual:${Date.now()}`,
  });

  return Response.json(
    { surface: TEST_SURFACE, run },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Fruma-Version": TEST_SURFACE },
    },
  );
}
