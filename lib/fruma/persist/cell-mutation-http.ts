import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionFounder, type Founder } from "@/lib/gate";
import {
  appendCellMutations,
  parseExceptionBatch,
} from "@/lib/fruma/persist/append-cell-mutations";
import { LEDGER_SCHEMAS, type LedgerSchemaName } from "@/lib/fruma/persist/postgres-schema";
import { tenantNamespaceFromSessionCookies } from "@/lib/fruma/persist/tenant-session";

const OFFLINE = "Infrastructure Environment Offline";
const EMPTY_PAYLOAD = "Empty payloads rejected";
const INVALID_SCOPE = "Invalid isolation scope";

/** `demo`, `test`, or `production`. Anything else, including a schema string, is rejected. */
export function isolationSchema(value: unknown): LedgerSchemaName | "invalid" {
  if (value === "demo" || value === "test" || value === "production") return LEDGER_SCHEMAS[value];
  return "invalid";
}

export function payloadHasExceptions(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const exceptions = (body as { exceptions?: unknown }).exceptions;
  return Array.isArray(exceptions) && exceptions.length > 0;
}

async function founderFromCookies(
  jar: Awaited<ReturnType<typeof cookies>>,
): Promise<Founder | null> {
  for (const cookie of jar.getAll()) {
    const founder = await sessionFounder(cookie.value);
    if (founder) return founder;
  }
  return null;
}

/**
 * One append of confirm events for the signed-in schema.
 * `SET LOCAL` lives inside that transaction, so the pooled connection does not keep the schema.
 */
export async function postCellMutationRequest(req: Request): Promise<Response> {
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

  if (!payloadHasExceptions(body)) {
    return NextResponse.json({ error: EMPTY_PAYLOAD }, { status: 400 });
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

  const parsed = parseExceptionBatch(body, founder);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const applied = await appendCellMutations(namespace, parsed.exceptions, founder);
    return NextResponse.json({ status: "success", applied });
  } catch (error) {
    console.error("[LEDGER APPEND FAILURE] cell mutations:", error);
    return NextResponse.json({ error: "The append did not complete." }, { status: 500 });
  }
}
