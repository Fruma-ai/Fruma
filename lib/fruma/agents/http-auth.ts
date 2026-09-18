import { DEMO_COOKIE, sessionFounder } from "@/lib/gate";

export function cookieNamed(request: Request, name: string): string | undefined {
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

export async function requireFounder(request: Request) {
  return sessionFounder(cookieNamed(request, DEMO_COOKIE));
}
