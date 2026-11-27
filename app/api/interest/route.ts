import { NextResponse } from "next/server";

const INBOX = "owen@fruma.ai";
const KINDS = new Set(["brand", "mill", "retailer"]);

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the form." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const company = String(body.company ?? "").trim();
  const kind = String(body.kind ?? "").trim();

  const mill = String(body.mill ?? "").trim();

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Add your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json({ error: "Add a working email." }, { status: 400 });
  }
  if (!company || company.length > 160) {
    return NextResponse.json({ error: "Add the organisation." }, { status: 400 });
  }
  if (mill.length > 160) {
    return NextResponse.json({ error: "Mill name is too long." }, { status: 400 });
  }
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Tell us which you are." }, { status: 400 });
  }

  // Email delivery is client-side (FormSubmit). This route only validates/logs —
  // Vercel datacenter IPs get Cloudflare-challenged by formsubmit.co.
  console.info("interest", {
    name,
    email,
    company,
    kind,
    mill: mill || undefined,
    clientSent: Boolean(body.clientSent),
    inbox: INBOX,
  });

  return NextResponse.json({ ok: true, inbox: INBOX, delivery: "client-formsubmit" });
}
