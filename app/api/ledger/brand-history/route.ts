import { postBrandHistoryRequest } from "@/lib/fruma/persist/brand-history-http";

export const runtime = "nodejs";

export function POST(req: Request) {
  return postBrandHistoryRequest(req);
}
