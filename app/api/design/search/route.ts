import "server-only";

import { NextResponse } from "next/server";
import { handleDesignSearchRequest } from "@/lib/fruma/design/search-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const outcome = await handleDesignSearchRequest(request);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
