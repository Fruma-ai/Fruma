import "server-only";

import { NextResponse } from "next/server";
import { handleAcceptStagedSuggestionsRequest } from "@/lib/fruma/ingest/suggest-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const outcome = await handleAcceptStagedSuggestionsRequest(request);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
