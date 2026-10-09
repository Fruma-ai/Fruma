import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionFounder, type Founder } from "@/lib/gate";
import { schemaForTenantVersion } from "@/lib/fruma/persist/append-cell-mutations";
import { matchBrandHistory, parseBrandHistoryQuery } from "@/lib/fruma/persist/brand-history-match";
import { tenantNamespaceFromSessionCookies } from "@/lib/fruma/persist/tenant-session";

export const runtime = "nodejs";

async function founderFromCookies(
  jar: Awaited<ReturnType<typeof cookies>>,
): Promise<Founder | null> {
  for (const cookie of jar.getAll()) {
    const founder = await sessionFounder(cookie.value);
    if (founder) return founder;
  }
  return null;
}

export async function POST(req: Request) {
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

  const requested = schemaForTenantVersion(
    body && typeof body === "object" ? (body as { tenantVersion?: unknown }).tenantVersion : undefined,
  );
  if (requested === "invalid" || (requested && requested !== namespace)) {
    return NextResponse.json({ error: "tenant mismatch" }, { status: 403 });
  }

  const parsed = parseBrandHistoryQuery(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const matches = await matchBrandHistory(namespace, parsed.targetGsm, parsed.targetWidth);
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[LEDGER READ FAILURE] brand history match:", error);
    return NextResponse.json({ error: "The match did not complete." }, { status: 500 });
  }
}
