export type TruthStatus =
  | "evidenced"
  | "confirmed"
  | "inferred"
  | "missing"
  | "physical-only"
  | "stale";

export type TruthScope =
  | "quality"
  | "product"
  | "mill-site"
  | "organisation"
  | "process"
  | "shipment";

export type SourceType =
  | "mill-file"
  | "brief"
  | "sketch"
  | "mill-response"
  | "evidence-document"
  | "approved-product-record"
  | "destination-mapping";

export type ProductTruthFact = {
  id: string;
  productId: string;
  field: string;
  value: string | number | boolean | null;
  sourceType: SourceType;
  /**
   * Mill-file facts reference `fruma_source_cells.id`.
   * Coordinates come from that row, not from a copied string.
   */
  sourceCellId?: string;
  /** Mill-file facts reference `fruma_deposits.id`. Must be the cell's deposit. */
  depositId?: string;
  sourceRecordId?: string;
  sourceField?: string;
  sourceValue?: string | number | boolean | null;
  scope: TruthScope;
  status: TruthStatus;
  evidenceId?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  validFrom?: string;
  validUntil?: string;
  applicability?: string[];
  version: number;
};

/** A mill-file fact that can be joined to a source cell and its deposit. */
export type MillLinkedFact = ProductTruthFact & {
  sourceType: "mill-file";
  sourceCellId: string;
  depositId: string;
};

export function isMillLinkedFact(fact: ProductTruthFact): fact is MillLinkedFact {
  return fact.sourceType === "mill-file" && Boolean(fact.sourceCellId) && Boolean(fact.depositId);
}

export type EvidenceRecord = {
  id: string;
  claim: string;
  scope: TruthScope;
  subjectId: string;
  documentId?: string;
  issuer?: string;
  validFrom?: string;
  validUntil?: string;
  status: "current" | "expired" | "missing" | "unverified";
};

export type BrandMillRelationship = {
  id: string;
  brandId: string;
  millId: string;
  preference: "preferred" | "standard" | "excluded";
  provenCategories: string[];
  productIds: string[];
  qualityIds: string[];
  lastConfirmedAt?: string;
  privateNotes?: string;
};

export type ProductTruthRecord = {
  productId: string;
  version: number;
  facts: ProductTruthFact[];
  evidence: EvidenceRecord[];
  lockedSourceId?: string;
};

/**
 * Fruma never upgrades a missing or inferred fact into confirmed truth merely
 * because an agent can produce a plausible value. Confirmation/evidence must
 * come from an attributable source.
 */
export function isDestinationSafe(fact: ProductTruthFact) {
  return fact.status === "evidenced" || fact.status === "confirmed";
}

export function isCurrentEvidence(evidence: EvidenceRecord, at = new Date()) {
  if (evidence.status !== "current") return false;
  if (!evidence.validUntil) return true;
  return new Date(evidence.validUntil).getTime() >= at.getTime();
}
