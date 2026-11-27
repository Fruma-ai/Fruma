import { NextResponse } from "next/server";

const INBOX = "owen@fruma.ai";
const ROLES = new Set(["brand", "designer", "factory", "other"]);

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

  const roleLabel =
    role === "brand"
      ? "Apparel brand"
      : role === "designer"
        ? "Designer / design studio"
        : role === "factory"
          ? "Factory / mill"
          : "Other";

  const sent = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(INBOX)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: `Fruma demo request — ${roleLabel} — ${company}`,
      _replyto: email,
      name,
      email,
      company,
      role: roleLabel,
      notes: notes || "No notes provided.",
      source: "www.fruma.ai marketplace demo form",
    }),
  });

  if (!sent.ok) {
    console.error("demo-request: formsubmit failed", sent.status);
    return NextResponse.json(
      { error: "Could not send that just now. Email owen@fruma.ai." },
      { status: 502 },
    );
  }

  console.info("demo-request", { name, email, company, role, inbox: INBOX });
  return NextResponse.json({ ok: true });
}
