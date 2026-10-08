import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_COOKIE, sessionFounder } from "@/lib/gate";

/**
 * Workspace and ledger API gate.
 * The founder session cookie is `fruma_demo`. `operator_cookie` is a ledger column, not this cookie.
 * `x-fruma-version` selects a schema and does not authenticate the request.
 */
export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(DEMO_COOKIE)?.value;
  if (await sessionFounder(cookie)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized_operator" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/enter";
  url.search = "";
  url.searchParams.set("next", request.nextUrl.pathname);
  url.searchParams.set("reason", "unauthorized_operator_intercept");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/app/:path*",
    "/brand/:path*",
    "/map/:path*",
    "/deposits/:path*",
    "/qualities/:path*",
    "/grants/:path*",
    "/api/design/:path*",
    "/api/analytics/:path*",
    "/api/sourcing/:path*",
  ],
};
