import { requireFounder } from "@/lib/fruma/agents/http-auth";
import {
  confirmMappingProposal,
  latestAgentRun,
  runMappingAgent,
} from "@/lib/fruma/agents";
import type { StandardField } from "@/lib/fruma/ingest/types";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

const FIELDS = new Set<StandardField>([
  "article",
  "construction",
  "composition",
  "weight",
  "width",
  "colour",
  "moq",
  "customer",
  "cert",
]);

export async function GET(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to view mapping agent results." }, { status: 401 });
  }
  return Response.json({ surface: TEST_SURFACE, run: latestAgentRun("mapping") ?? null });
}

export async function POST(request: Request) {
  const who = await requireFounder(request);
  if (!who) {
    return Response.json({ error: "Sign in to run the Mapping agent." }, { status: 401 });
  }

  let body: {
    action?: "run" | "confirm";
    header?: string;
    field?: string;
    autoConfirmHighConfidence?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = { action: "run" };
  }

  if (body.action === "confirm") {
    const header = body.header?.trim();
    const field = body.field as StandardField | undefined;
    if (!header || !field || !FIELDS.has(field)) {
      return Response.json(
        { error: "confirm requires header and a valid Fruma field." },
        { status: 400 },
      );
    }
    const confirmed = confirmMappingProposal(header, field);
    return Response.json({ surface: TEST_SURFACE, confirmed });
  }

  const run = runMappingAgent({
    autoConfirmHighConfidence: body.autoConfirmHighConfidence ?? true,
    idempotencyKey: `mapping:manual:${Date.now()}`,
  });

  return Response.json(
    { surface: TEST_SURFACE, run },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Fruma-Version": TEST_SURFACE },
    },
  );
}
