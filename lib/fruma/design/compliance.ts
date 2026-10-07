import { sourceCellId } from "../ingest/cell-mutations";
import { columnLetter } from "../ingest/columns";
import type { ActiveProductTruthEvidence, MaterialSearchHit } from "../persist";
import { isCurrentEvidence, type EvidenceRecord } from "../product-truth";

export const COMPLIANCE_TARGETS = ["EU_DPP", "UK_STANDARDS"] as const;
export type ComplianceTarget = (typeof COMPLIANCE_TARGETS)[number];

const DPP_CLAIMS = new Set(["traceability", "circularity"]);

export type ComplianceWarning = {
  status: "compliance_warning";
  complianceTarget: "EU_DPP";
  qualityId: string;
  message: string;
};

export type ComplianceQuality = {
  id: string;
  supplierOrgId: string;
  millArticleCode: string;
  depositId: string;
  cells: { sheet: string; row: number; column: string }[];
};

const WARNING_MESSAGE =
  "No current unexpired evidence document covers traceability or circularity for this quality.";

export function readComplianceTarget(body: object): ComplianceTarget | null | "invalid" {
  if (!Object.prototype.hasOwnProperty.call(body, "complianceTarget")) return null;
  const value = (body as { complianceTarget?: unknown }).complianceTarget;
  if (value === null) return null;
  if (value === "EU_DPP" || value === "UK_STANDARDS") return value;
  return "invalid";
}

function isDppClaim(value: string): boolean {
  return DPP_CLAIMS.has(value.trim().toLowerCase());
}

function isDppEvidenceDocument(evidence: EvidenceRecord, at: Date): boolean {
  if (!isDppClaim(evidence.claim)) return false;
  if (!evidence.documentId?.trim()) return false;
  return isCurrentEvidence(evidence, at);
}

function cellIdsForQuality(quality: ComplianceQuality, hits: readonly MaterialSearchHit[]): Set<string> {
  const pointers = new Set(quality.cells.map((cell) => `${cell.sheet}\0${cell.row}\0${cell.column}`));
  const ids = new Set<string>();
  for (const cell of quality.cells) {
    ids.add(sourceCellId(quality.depositId, cell));
  }
  for (const hit of hits) {
    if (hit.cell.depositId !== quality.depositId) continue;
    const column = columnLetter(hit.cell.colIndex - 1);
    const key = `${hit.cell.sheetName}\0${hit.cell.rowIndex}\0${column}`;
    if (pointers.has(key)) ids.add(hit.cell.id);
  }
  return ids;
}

/**
 * A quality is covered when a current Evidence document for traceability or circularity
 * is addressed to that quality id, or a fact on one of its cells points at that document.
 */
export function euDppComplianceWarning(
  quality: ComplianceQuality,
  records: readonly ActiveProductTruthEvidence[],
  hits: readonly MaterialSearchHit[],
  at = new Date(),
): ComplianceWarning | null {
  const subjects = new Set([quality.id, `${quality.supplierOrgId}:${quality.millArticleCode}`]);
  const cellIds = cellIdsForQuality(quality, hits);
  for (const record of records) {
    const linkedEvidence = new Set<string>();
    for (const fact of record.facts) {
      if (!fact.evidenceId || !fact.sourceCellId || !cellIds.has(fact.sourceCellId)) continue;
      linkedEvidence.add(fact.evidenceId);
    }
    for (const evidence of record.evidence) {
      if (!isDppEvidenceDocument(evidence, at)) continue;
      if (subjects.has(evidence.subjectId) || linkedEvidence.has(evidence.id)) {
        return null;
      }
    }
  }
  return {
    status: "compliance_warning",
    complianceTarget: "EU_DPP",
    qualityId: quality.id,
    message: WARNING_MESSAGE,
  };
}

export type CertificateReading = {
  claim: string;
  status: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  documentId: string | null;
  evidenceStatus: EvidenceRecord["status"] | null;
  validUntil: string | null;
};

/** Certificate readings for one quality, taken from Evidence already loaded in the active schema. */
export function certificatesForQuality(
  quality: ComplianceQuality,
  records: readonly ActiveProductTruthEvidence[],
  hits: readonly MaterialSearchHit[],
): CertificateReading[] {
  const subjects = new Set([quality.id, `${quality.supplierOrgId}:${quality.millArticleCode}`]);
  const cellIds = cellIdsForQuality(quality, hits);
  const readings: CertificateReading[] = [];
  for (const record of records) {
    const linked = new Set(
      record.facts
        .filter((fact) => fact.evidenceId && fact.sourceCellId && cellIds.has(fact.sourceCellId))
        .map((fact) => fact.evidenceId as string),
    );
    for (const evidence of record.evidence) {
      if (!subjects.has(evidence.subjectId) && !linked.has(evidence.id)) continue;
      const fact =
        record.facts.find((row) => row.evidenceId === evidence.id) ??
        record.facts.find(
          (row) =>
            row.field.trim().toLowerCase() === evidence.claim.trim().toLowerCase() &&
            (!row.sourceCellId || cellIds.has(row.sourceCellId)),
        );
      readings.push({
        claim: evidence.claim,
        status: fact?.status ?? null,
        confirmedBy: fact?.confirmedBy ?? null,
        confirmedAt: fact?.confirmedAt ?? null,
        documentId: evidence.documentId ?? null,
        evidenceStatus: evidence.status,
        validUntil: evidence.validUntil ?? null,
      });
    }
  }
  return readings;
}

export function applyEuDppCompliance<T extends ComplianceQuality>(
  qualities: readonly T[],
  records: readonly ActiveProductTruthEvidence[],
  hits: readonly MaterialSearchHit[],
  at = new Date(),
): Array<T & { compliance_warning?: ComplianceWarning }> {
  return qualities.map((quality) => {
    const warning = euDppComplianceWarning(quality, records, hits, at);
    if (!warning) return quality;
    return { ...quality, compliance_warning: warning };
  });
}
