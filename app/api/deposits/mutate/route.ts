import { postCellMutationRequest } from "@/lib/fruma/persist/cell-mutation-http";

export const runtime = "nodejs";

export function POST(req: Request) {
  return postCellMutationRequest(req);
}
