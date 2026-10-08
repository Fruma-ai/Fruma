import "server-only";

import { NextResponse } from "next/server";
import { handleVisualSearchRequest } from "@/lib/fruma/design/visual-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const outcome = await handleVisualSearchRequest(request);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
