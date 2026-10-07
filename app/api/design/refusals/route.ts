import "server-only";

import { NextResponse } from "next/server";
import { handleDesignRefusalsRequest } from "@/lib/fruma/design/refusals-http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const outcome = await handleDesignRefusalsRequest(request);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
