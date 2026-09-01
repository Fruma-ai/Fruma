import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_COOKIE, sessionFounder } from "@/lib/gate";

export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(DEMO_COOKIE)?.value;
  if (await sessionFounder(cookie)) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/enter";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app/:path*", "/brand/:path*", "/map/:path*"],
};
