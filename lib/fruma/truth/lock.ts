import { randomUUID } from "node:crypto";
import type { MillConfirmation } from "../persist";
import type { BrandBrief } from "../intelligence/retrieval";
import {
  type ProductTruthFact,
  type ProductTruthRecord,
  type EvidenceRecord,
} from "../product-truth";
import { getSpineStore } from "../persist";
import type { FrumaVersion } from "../versions";
import { TEST_SURFACE } from "../surfaces";

export type LockSourceInput = {
  brief: BrandBrief;
  millOrgId: string;
  millName: string;
  qualityArticle: string;
  depositId: string;
  constructionAsWritten: string;
  compositionAsWritten: string;
  weightAsWritten: string;
  colourAsWritten: string;
  confirmation: MillConfirmation;
  /** Prior version if re-locking; defaults to 1. */
  priorVersion?: number;
  surface?: FrumaVersion;
};

function fact(partial: Omit<ProductTruthFact, "id" | "version"> & { version: number }): ProductTruthFact {
  return { id: `fact_${randomUUID()}`, ...partial };
}

/**
 * Lock a brand product onto a mill quality after a timestamped mill confirmation.
 * Brand-private. Never invents certs. Commercials come only from the confirmation.
 */
export function buildLockedProductTruth(input: LockSourceInput): ProductTruthRecord {
  const version = (input.priorVersion ?? 0) + 1;
  const productId = input.brief.productId;
  const lockedSourceId = `${input.millOrgId}:${input.qualityArticle}`;

  const facts: ProductTruthFact[] = [
    fact({
      productId,
      field: "intent",
      value: input.brief.intent,
      sourceType: "brief",
      sourceRecordId: input.brief.productId,
      scope: "product",
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      version,
    }),
    fact({
      productId,
      field: "mill_article",
      value: input.qualityArticle,
      sourceType: "mill-file",
      sourceRecordId: input.depositId,
      sourceField: "article",
      sourceValue: input.qualityArticle,
      scope: "quality",
      status: "evidenced",
      version,
    }),
    fact({
      productId,
      field: "construction",
      value: input.constructionAsWritten,
      sourceType: "mill-file",
      sourceRecordId: input.depositId,
      sourceField: "construction",
      sourceValue: input.constructionAsWritten,
      scope: "quality",
      status: "evidenced",
      version,
    }),
    fact({
      productId,
      field: "composition",
      value: input.compositionAsWritten,
      sourceType: "mill-file",
      sourceRecordId: input.depositId,
      sourceField: "composition",
      sourceValue: input.compositionAsWritten,
      scope: "quality",
      status: "evidenced",
      version,
    }),
    fact({
      productId,
      field: "weight",
      value: input.weightAsWritten,
      sourceType: "mill-file",
      sourceRecordId: input.depositId,
      sourceField: "weight",
      sourceValue: input.weightAsWritten,
      scope: "quality",
      status: "evidenced",
      version,
    }),
    fact({
      productId,
      field: "colour",
      value: input.colourAsWritten,
      sourceType: "mill-file",
      sourceRecordId: input.depositId,
      sourceField: "colour",
      sourceValue: input.colourAsWritten,
      scope: "quality",
      status: input.colourAsWritten ? "evidenced" : "missing",
      version,
    }),
    fact({
      productId,
      field: "moq_m",
      value: input.confirmation.moqM,
      sourceType: "mill-response",
      sourceRecordId: input.confirmation.id,
      scope: "quality",
      status: "confirmed",
      confirmedBy: input.millOrgId,
      confirmedAt: input.confirmation.confirmedAt,
      version,
    }),
    fact({
      productId,
      field: "lead_weeks",
      value: input.confirmation.leadWeeks,
      sourceType: "mill-response",
      sourceRecordId: input.confirmation.id,
      scope: "quality",
      status: "confirmed",
      confirmedBy: input.millOrgId,
      confirmedAt: input.confirmation.confirmedAt,
      version,
    }),
    fact({
      productId,
      field: "source_mill",
      value: input.millName,
      sourceType: "mill-response",
      sourceRecordId: input.confirmation.requestId,
      scope: "organisation",
      status: "confirmed",
      confirmedAt: input.confirmation.confirmedAt,
      version,
    }),
  ];

  const evidence: EvidenceRecord[] = [
    {
      id: `ev_${randomUUID()}`,
      claim: "mill_commercial_terms",
      scope: "quality",
      subjectId: lockedSourceId,
      status: "current",
      validFrom: input.confirmation.confirmedAt,
    },
  ];

  return {
    productId,
    version,
    facts,
    evidence,
    lockedSourceId,
  };
}

export async function lockProductSource(input: LockSourceInput): Promise<ProductTruthRecord> {
  if (!input.confirmation.available) {
    throw new Error("cannot_lock_unavailable_quality");
  }
  const surface = input.surface ?? TEST_SURFACE;
  const store = getSpineStore(surface);
  const snap = await store.load();
  const prior = snap.productTruth
    .filter((r) => r.productId === input.brief.productId)
    .sort((a, b) => b.version - a.version)[0];
  const record = buildLockedProductTruth({
    ...input,
    priorVersion: prior?.version ?? input.priorVersion ?? 0,
  });
  await store.saveProductTruth(record);
  return record;
}
