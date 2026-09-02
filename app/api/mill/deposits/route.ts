import "server-only";

import { NextResponse } from "next/server";
import { handleMillDepositRequest } from "@/lib/fruma/ingest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { status, body } = await handleMillDepositRequest(request);
  return NextResponse.json(body, { status });
}
