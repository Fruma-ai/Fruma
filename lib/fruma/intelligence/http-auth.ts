import { DEMO_COOKIE, sessionFounder } from "../../gate";

function cookieNamed(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

export async function requireTestFounder(request: Request) {
  const who = await sessionFounder(cookieNamed(request, DEMO_COOKIE));
  if (!who) return null;
  return who;
}

export function testJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Fruma-Version": "test" },
  });
}
