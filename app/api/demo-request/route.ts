import { NextResponse } from "next/server";

const INBOX = "owen@fruma.ai";
const ROLES = new Set(["brand", "designer", "factory", "other"]);

/**
 * Validates marketplace demo payloads and logs them.
 * Actual email delivery is done client-side via FormSubmit — Vercel server
 * IPs are Cloudflare-challenged by formsubmit.co, so server-side send fails.
 */
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
  const role = String(body.role ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const clientSent = Boolean(body.clientSent);

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Add your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json({ error: "Add a working email." }, { status: 400 });
  }
  if (!company || company.length > 160) {
    return NextResponse.json({ error: "Add your company." }, { status: 400 });
  }
  if (!ROLES.has(role)) {
    return NextResponse.json({ error: "Tell us who you represent." }, { status: 400 });
  }
  if (notes.length > 2000) {
    return NextResponse.json({ error: "Notes are too long." }, { status: 400 });
  }

  console.info("demo-request", {
    name,
    email,
    company,
    role,
    notes: notes || undefined,
    clientSent,
    inbox: INBOX,
  });

  return NextResponse.json({
    ok: true,
    inbox: INBOX,
    delivery: "client-formsubmit",
  });
}
