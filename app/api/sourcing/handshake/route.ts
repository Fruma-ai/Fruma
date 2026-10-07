import "server-only";

import { NextResponse } from "next/server";
import { handleSourcingHandshakeRequest } from "@/lib/fruma/sourcing/handshake-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const outcome = await handleSourcingHandshakeRequest(request);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
