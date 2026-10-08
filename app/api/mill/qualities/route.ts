import "server-only";

import { NextResponse } from "next/server";
import { handleMillQualitiesRequest } from "@/lib/fruma/ingest/qualities-http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const outcome = await handleMillQualitiesRequest(request);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
