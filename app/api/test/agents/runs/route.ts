import { requireFounder } from "@/lib/fruma/agents/http-auth";
import { listAgentRuns } from "@/lib/fruma/agents";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to view agent runs." }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  return Response.json({
    surface: TEST_SURFACE,
    memory: "in-process",
    note: "Agent runs and confirmed header maps live in server memory until Postgres is connected.",
    runs: listAgentRuns(Number.isFinite(limit) ? limit : 20),
  });
}
