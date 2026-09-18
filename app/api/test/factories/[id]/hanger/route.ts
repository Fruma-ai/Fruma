import { DEMO_COOKIE, sessionFounder } from "@/lib/gate";
import { factoryById, hangerCsvFor } from "@/lib/fruma/test-corpus";
import { TEST_SURFACE } from "@/lib/fruma/surfaces";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

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

export async function GET(request: Request, { params }: Params) {
  const who = await sessionFounder(cookieNamed(request, DEMO_COOKIE));
  if (!who) {
    return Response.json({ error: "Sign in to download test hangers." }, { status: 401 });
  }

  const { id } = await params;
  const factory = factoryById(id);
  if (!factory) {
    return Response.json({ error: "unknown_factory" }, { status: 404 });
  }

  const csv = hangerCsvFor(factory);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${factory.filename}"`,
      "Cache-Control": "no-store",
      "X-Fruma-Version": TEST_SURFACE,
      "X-Fruma-Factory-Id": factory.id,
    },
  });
}
