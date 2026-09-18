import { resolveHeaderField } from "../ingest/header-map";
import type { StandardField } from "../ingest/types";

/**
 * Proposals only. Never auto-applied. Covers the six Test mill-file dialects
 * that builtin aliases miss (Art., Weave, GSM, imperial units, …).
 */
export const PROPOSAL_LEXICON: Record<string, StandardField> = {
  "art.": "article",
  art: "article",
  "article nº": "article",
  "article no": "article",
  articolo: "article",
  weave: "construction",
  "knit type": "construction",
  structure: "construction",
  "comp.": "composition",
  fibre: "composition",
  fiber: "composition",
  "wgt gsm": "weight",
  gsm: "weight",
  "weight oz": "weight",
  "usable width": "width",
  "width cm": "width",
  'width "': "width",
  "width in": "width",
  colourway: "colour",
  colorway: "colour",
  "min order": "moq",
  "moq m": "moq",
  "moq yds": "moq",
  "moq metres": "moq",
  buyer: "customer",
  "customer ref": "customer",
  certificate: "cert",
  certifications: "cert",
};

export type MappingProposal = {
  header: string;
  proposedField: StandardField | null;
  confidence: "high" | "med" | "low";
  rationale: string;
  sampleValues: string[];
  alreadyMapped: boolean;
  confirmed: boolean;
};

export function proposeFieldForHeader(
  header: string,
  sampleValues: string[] = [],
  overlays?: Record<string, StandardField>,
): MappingProposal {
  const trimmed = header.trim();
  const existing = resolveHeaderField(trimmed, overlays);
  if (existing) {
    return {
      header: trimmed,
      proposedField: existing,
      confidence: "high",
      rationale: overlays?.[trimmed.toLowerCase()]
        ? "Confirmed dialect overlay."
        : "Resolved by builtin mill-header alias.",
      sampleValues: sampleValues.slice(0, 3),
      alreadyMapped: true,
      confirmed: Boolean(overlays?.[trimmed.toLowerCase()]),
    };
  }

  const proposed = PROPOSAL_LEXICON[trimmed.toLowerCase()];
  if (!proposed) {
    return {
      header: trimmed,
      proposedField: null,
      confidence: "low",
      rationale: "No lexicon match. Needs human review — will not invent a field.",
      sampleValues: sampleValues.slice(0, 3),
      alreadyMapped: false,
      confirmed: false,
    };
  }

  return {
    header: trimmed,
    proposedField: proposed,
    confidence: "high",
    rationale: `Lexicon match for mill header “${trimmed}”. Confirm to attach; source value stays as written.`,
    sampleValues: sampleValues.slice(0, 3),
    alreadyMapped: false,
    confirmed: false,
  };
}

export function lexiconHeaderOverlays(): Record<string, StandardField> {
  return { ...PROPOSAL_LEXICON };
}
