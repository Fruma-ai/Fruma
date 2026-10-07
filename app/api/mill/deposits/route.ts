import "server-only";

import { NextResponse } from "next/server";
import { handleMillDepositRequest } from "@/lib/fruma/ingest";
import { depositPointerFrom, sourceCellsFrom } from "@/lib/fruma/ingest/persist-deposit";
import { getSpineStore, isIdempotencyException } from "@/lib/fruma/persist";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const outcome = await handleMillDepositRequest(request);
    if (outcome.status === 200) {
      const store = getSpineStore(outcome.surface);
      await store.saveDepositPointer(depositPointerFrom(outcome.result), outcome.bytes);
      await store.saveSourceCells(sourceCellsFrom(outcome.result));
    }
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (err) {
    if (isIdempotencyException(err)) {
      return NextResponse.json(
        { error: err.message, conflict: err.conflict },
        { status: 409 },
      );
    }
    throw err;
  }
}
