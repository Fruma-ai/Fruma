import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionFounder, type Founder } from "@/lib/gate";
import {
  appendCellMutations,
  parseExceptionBatch,
  schemaForTenantVersion,
} from "@/lib/fruma/persist/append-cell-mutations";
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

  const parsed = parseExceptionBatch(body, founder);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const count = await appendCellMutations(namespace, parsed.exceptions, founder);
    return NextResponse.json({ status: "success", count });
  } catch (error) {
    console.error("[LEDGER APPEND FAILURE] cell mutations:", error);
    return NextResponse.json({ error: "The append did not complete." }, { status: 500 });
  }
}
