import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionFounder, type Founder } from "@/lib/gate";
import { matchBrandHistory, missingQueryDimensions, parseBrandHistoryQuery } from "@/lib/fruma/persist/brand-history-match";
import { isolationSchema } from "@/lib/fruma/persist/cell-mutation-http";
import { tenantNamespaceFromSessionCookies } from "@/lib/fruma/persist/tenant-session";

const OFFLINE = "Infrastructure Environment Offline";
const MISSING_DIMENSIONS = "Missing query dimensions";
const INVALID_SCOPE = "Invalid isolation scope";
const SCAN_FAILED = "Failed to scan historical warehouse matrix.";

async function founderFromCookies(
  jar: Awaited<ReturnType<typeof cookies>>,
): Promise<Founder | null> {
  for (const cookie of jar.getAll()) {
    const founder = await sessionFounder(cookie.value);
    if (founder) return founder;
  }
  return null;
}

/** Read-only cloth scan. The session schema owns the transaction. */
export async function postBrandHistoryRequest(req: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: OFFLINE }, { status: 500 });
  }

  const jar = await cookies();
  const founder = await founderFromCookies(jar);
  const namespace = await tenantNamespaceFromSessionCookies(jar);
  if (!founder || !namespace) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (missingQueryDimensions(body)) {
    return NextResponse.json({ error: MISSING_DIMENSIONS }, { status: 400 });
  }

  const requested = isolationSchema(
    body && typeof body === "object" ? (body as { tenantVersion?: unknown }).tenantVersion : undefined,
  );
  if (requested === "invalid") {
    return NextResponse.json({ error: INVALID_SCOPE }, { status: 400 });
  }
  if (requested !== namespace) {
    return NextResponse.json({ error: "tenant mismatch" }, { status: 403 });
  }

  const parsed = parseBrandHistoryQuery(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const matches = await matchBrandHistory(namespace, parsed.targetGsm, parsed.targetWidth);
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[LEDGER READ FAILURE] brand history match:", error);
    return NextResponse.json({ error: SCAN_FAILED }, { status: 500 });
  }
}
