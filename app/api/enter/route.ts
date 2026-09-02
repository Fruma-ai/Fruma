import { NextResponse } from "next/server";
import {
  DEMO_COOKIE,
  founderFromLogin,
  passwordFor,
  sessionToken,
} from "@/lib/gate";

export async function POST(request: Request) {
  let body: {
    email?: string;
    username?: string;
    who?: string;
    password?: string;
    next?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 },
    );
  }

  const who = founderFromLogin(
    String(body.email ?? body.username ?? body.who ?? ""),
  );
  const given = String(body.password ?? "");
  if (!who || !given || given !== passwordFor(who)) {
    return NextResponse.json(
      { error: "Wrong email or password." },
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
