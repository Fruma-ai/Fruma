import type { CertificateReading, ComplianceWarning } from "./compliance";
import { MATERIAL_SEARCH_CANDIDATE_LIMIT } from "../persist/embeddings";

/**
 * Closest rows returned by the HNSW scan.
 * The compliance coefficient is applied to this window, then the rows are reordered.
 */
export const DESIGN_SEARCH_RESULT_LIMIT = MATERIAL_SEARCH_CANDIDATE_LIMIT;

/**
 * Multiplies similarity when a quality's certificates are fully evidenced,
 * human-confirmed, and free of gaps. Similarity is `1 - cosineDistance`.
 */
export const COMPLIANCE_READY_COEFFICIENT = 1.25;

const REQUIRED_CERTIFICATES: Record<string, readonly string[]> = {
  EU_DPP: ["traceability", "circularity"],
  UK_STANDARDS: ["cert"],
};

const GAP_FACT_STATUSES = new Set(["missing", "inferred", "stale", "physical-only"]);
const GAP_EVIDENCE_STATUSES = new Set(["expired", "missing", "unverified"]);

/** One vector-search row. Certificate readings come from the active schema's Evidence layer. */
export type SearchResult = {
  id: string;
  cosineDistance: number;
  rank: number;
  score?: number;
  certificates?: CertificateReading[];
  compliance_warning?: ComplianceWarning;
};

function claimKey(value: string): string {
  return value.trim().toLowerCase();
}

function isCurrentDocument(reading: CertificateReading, at: Date): boolean {
  if (reading.evidenceStatus !== "current") return false;
  if (!reading.documentId?.trim()) return false;
  if (!reading.validUntil) return true;
  return new Date(reading.validUntil).getTime() >= at.getTime();
}

function isFullyEvidencedCertificate(reading: CertificateReading, at: Date): boolean {
  return (
    reading.status === "evidenced" &&
    Boolean(reading.confirmedBy?.trim()) &&
    Boolean(reading.confirmedAt?.trim()) &&
    isCurrentDocument(reading, at)
  );
}

function readingIsGap(reading: CertificateReading, at: Date): boolean {
  if (reading.status && GAP_FACT_STATUSES.has(reading.status)) return true;
  if (reading.evidenceStatus && GAP_EVIDENCE_STATUSES.has(reading.evidenceStatus)) return true;
  if (reading.validUntil && new Date(reading.validUntil).getTime() < at.getTime()) return true;
  return false;
}

/**
 * Ready means every certificate the target requires is evidenced and human-confirmed,
 * and none of those claims still has a gap.
 */
export function isComplianceReady(result: SearchResult, complianceTarget: string, at = new Date()): boolean {
  if (result.compliance_warning) return false;
  const required = REQUIRED_CERTIFICATES[complianceTarget];
  if (!required) return false;
  const certificates = result.certificates ?? [];
  return required.every((claim) => {
    const rows = certificates.filter((reading) => claimKey(reading.claim) === claim);
    if (rows.length === 0) return false;
    if (rows.some((reading) => readingIsGap(reading, at))) return false;
    return rows.every((reading) => isFullyEvidencedCertificate(reading, at));
  });
}

/**
 * Reorders the closest index rows. Does not open a database connection:
 * `certificates` must already have been read inside the active schema.
 * The coefficient is applied only to the closest `DESIGN_SEARCH_RESULT_LIMIT`
 * rows (the HNSW window). Anything farther never receives the boost.
 */
export function rerankByComplianceReadiness<T extends SearchResult>(
  results: T[],
  complianceTarget: string,
  at = new Date(),
): T[] {
  const shortlist = [...results]
    .sort(
      (a, b) =>
        a.cosineDistance - b.cosineDistance || a.rank - b.rank || a.id.localeCompare(b.id),
    )
    .slice(0, DESIGN_SEARCH_RESULT_LIMIT);
  const weighted = shortlist.map((result) => {
    const similarity = 1 - result.cosineDistance;
    const ready = isComplianceReady(result, complianceTarget, at);
    const score = similarity * (ready ? COMPLIANCE_READY_COEFFICIENT : 1);
    const next: T = { ...result, score };
    delete next.certificates;
    return next;
  });
  weighted.sort(
    (a, b) =>
      (b.score ?? 0) - (a.score ?? 0) ||
      a.cosineDistance - b.cosineDistance ||
      a.rank - b.rank ||
      a.id.localeCompare(b.id),
  );
  return weighted.map((result, index) => ({ ...result, rank: index + 1 }));
}
