import "server-only";

import { NextResponse } from "next/server";
import { handleFactoryMarketOpportunitiesRequest } from "@/lib/fruma/design/demand-gap-http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const outcome = await handleFactoryMarketOpportunitiesRequest(request);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
