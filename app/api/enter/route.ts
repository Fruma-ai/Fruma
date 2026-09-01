import { NextResponse } from "next/server";
import {
  DEMO_COOKIE,
  isFounder,
  passwordFor,
  sessionToken,
} from "@/lib/gate";

export async function POST(request: Request) {
  let body: { who?: string; password?: string; next?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send who you are, and a password." }, { status: 400 });
  }

  const who = String(body.who ?? "").toLowerCase();
  const given = String(body.password ?? "");
  if (!isFounder(who) || given !== passwordFor(who)) {
    return NextResponse.json(
      { error: "Only Owen, Chris or Sam can open the prototype." },
      { status: 401 },
    );
  }

  const nextPath =
    typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//")
      ? body.next
      : "/app";

  const res = NextResponse.json({ ok: true, next: nextPath });
  res.cookies.set({
    name: DEMO_COOKIE,
    value: await sessionToken(who),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
