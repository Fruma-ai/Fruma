import { randomUUID } from "node:crypto";
import {
  getSpineStore,
  type AnonymousMillRequest,
  type MillConfirmation,
} from "../persist";

export type CreateAnonymousRequestInput = {
  brandId: string;
  productId: string;
  millOrgId: string;
  qualityArticle: string;
  millVisible: AnonymousMillRequest["millVisible"];
};

/**
 * Brand creates a sourcing request. The mill-visible payload must never include
 * brand identity or cross-brand demand signals.
 */
export async function createAnonymousMillRequest(
  input: CreateAnonymousRequestInput,
): Promise<AnonymousMillRequest> {
  if (!input.millVisible.category) {
    throw new Error("mill_visible_category_required");
  }
  const request: AnonymousMillRequest = {
    id: `req_${randomUUID()}`,
    brandId: input.brandId,
    productId: input.productId,
    millOrgId: input.millOrgId,
    qualityArticle: input.qualityArticle,
    millVisible: { ...input.millVisible },
    status: "open",
    createdAt: new Date().toISOString(),
  };
  await getSpineStore().saveRequest(request);
  return request;
}

/** What a mill inbox is allowed to see — brand fields stripped. */
export function millViewOfRequest(request: AnonymousMillRequest) {
  return {
    id: request.id,
    millOrgId: request.millOrgId,
    qualityArticle: request.qualityArticle,
    millVisible: request.millVisible,
    status: request.status,
    createdAt: request.createdAt,
    answeredAt: request.answeredAt,
  };
}

export type AnswerMillRequestInput = {
  requestId: string;
  millOrgId: string;
  moqM: number;
  leadWeeks: number;
  available: boolean;
  note?: string;
};

/**
 * Mill answers with current commercials. Timestamped confirmation flips
 * fabric-book MOQ/lead from historical → confirmed.
 */
export async function answerMillRequest(
  input: AnswerMillRequestInput,
): Promise<{ request: AnonymousMillRequest; confirmation: MillConfirmation }> {
  const store = getSpineStore();
  const snap = await store.load();
  const request = snap.requests.find((r) => r.id === input.requestId);
  if (!request) throw new Error("unknown_request");
  if (request.millOrgId !== input.millOrgId) throw new Error("mill_mismatch");
  if (request.status === "withdrawn") throw new Error("request_withdrawn");
  if (!Number.isFinite(input.moqM) || input.moqM <= 0) throw new Error("invalid_moq");
  if (!Number.isFinite(input.leadWeeks) || input.leadWeeks < 0) throw new Error("invalid_lead");

  const confirmedAt = new Date().toISOString();
  const confirmation: MillConfirmation = {
    id: `conf_${randomUUID()}`,
    requestId: request.id,
    millOrgId: request.millOrgId,
    qualityArticle: request.qualityArticle,
    moqM: input.moqM,
    leadWeeks: input.leadWeeks,
    available: input.available,
    confirmedAt,
    note: input.note,
  };

  const answered: AnonymousMillRequest = {
    ...request,
    status: "answered",
    answeredAt: confirmedAt,
  };

  await store.saveRequest(answered);
  await store.saveConfirmation(confirmation);
  return { request: answered, confirmation };
}

export async function latestConfirmationFor(
  millOrgId: string,
  qualityArticle: string,
): Promise<MillConfirmation | null> {
  const snap = await getSpineStore().load();
  const matches = snap.confirmations
    .filter((c) => c.millOrgId === millOrgId && c.qualityArticle === qualityArticle && c.available)
    .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
  return matches[0] ?? null;
}

export function commercialFreshness(
  confirmation: MillConfirmation | null | undefined,
): "historical" | "confirmed" {
  return confirmation ? "confirmed" : "historical";
}
