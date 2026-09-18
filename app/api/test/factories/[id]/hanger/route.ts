import { factoryById, hangerCsvFor } from "@/lib/fruma/test-corpus";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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
      "X-Fruma-Version": "test",
      "X-Fruma-Factory-Id": factory.id,
    },
  });
}
