import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionFounder } from "@/lib/gate";
import { isMissingConfigurationException } from "@/lib/fruma/persist/configuration";
import { loadSourcingInbox, parseSupplierOrgId } from "@/lib/fruma/persist/sourcing-inbox";
import { resolveSourcingActor } from "@/lib/fruma/persist/sourcing-message";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const jar = await cookies();
  const actor = await resolveSourcingActor(
    (cookie) => sessionFounder(cookie),
    (name) => jar.get(name)?.value,
  );
  if (!actor) {
    return NextResponse.json({ error: "unauthorized_operator" }, { status: 401 });
  }

  const supplierOrgId = parseSupplierOrgId(new URL(request.url).searchParams.get("supplier_org_id"));
  if (!supplierOrgId) {
    return NextResponse.json({ error: "supplier_org_id_required" }, { status: 400 });
  }

  try {
    const messages = await loadSourcingInbox(actor.namespace, supplierOrgId);
    return NextResponse.json({ messages });
  } catch (error) {
    if (isMissingConfigurationException(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("[sourcing] inbox read failed", error);
    return NextResponse.json({ error: "inbox_read_failed" }, { status: 500 });
  }
}
