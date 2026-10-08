import "server-only";

import { NextResponse } from "next/server";
import { handleLedgerCellStateRequest } from "@/lib/fruma/ingest/ledger-cell-state";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const outcome = await handleLedgerCellStateRequest(request);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
