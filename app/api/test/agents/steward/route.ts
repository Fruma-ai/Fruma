import { requireFounder } from "@/lib/fruma/agents/http-auth";
import {
  STEWARD_PROMPT,
  blockedOnOwen,
  listStewardQueue,
  nextStewardPull,
} from "@/lib/fruma/agents/steward-queue";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

/** Signed-in snapshot of the unattended steward queue. */
export async function GET(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to view the steward queue." }, { status: 401 });
  }

  return Response.json(
    {
      surface: TEST_SURFACE,
      next: nextStewardPull(),
      blockedOnOwen: blockedOnOwen(),
      queue: listStewardQueue(),
      standingPrompt: STEWARD_PROMPT,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Fruma-Version": TEST_SURFACE },
    },
  );
}
