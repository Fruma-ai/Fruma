import type { StandardField } from "../ingest/types";
import { resolveHeaderField } from "../ingest/header-map";

/**
 * Lexicon used by the Mapping agent to *propose* (never auto-apply) fields
 * for unknown mill headers. Deterministic — no LLM required for v1.
 */
const PROPOSAL_LEXICON: Record<string, StandardField> = {
  "art.": "article",
  art: "article",
  "article nº": "article",
  "article no": "article",
  "articolo": "article",
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
  sampleValues: string[],
  overlays?: Record<string, StandardField>,
): MappingProposal | null {
  const trimmed = header.trim();
  if (!trimmed) return null;
  const existing = resolveHeaderField(trimmed, overlays);
  if (existing) {
    return {
      header: trimmed,
      proposedField: existing,
      confidence: "high",
      rationale: "Already resolved by builtin or confirmed overlay.",
      sampleValues: sampleValues.slice(0, 3),
      alreadyMapped: true,
      confirmed: Boolean(overlays?.[trimmed.toLowerCase()]),
    };
  }

  const key = trimmed.toLowerCase();
  const proposed = PROPOSAL_LEXICON[key];
  if (!proposed) {
    return {
      header: trimmed,
      proposedField: null,
      confidence: "low",
      rationale:
        "No lexicon match. Needs human review — Mapping agent will not invent a field.",
      sampleValues: sampleValues.slice(0, 3),
      alreadyMapped: false,
      confirmed: false,
    };
  }

  return {
    header: trimmed,
    proposedField: proposed,
    confidence: "high",
    rationale: `Lexicon match for dialect header "${trimmed}".`,
    sampleValues: sampleValues.slice(0, 3),
    alreadyMapped: false,
    confirmed: false,
  };
}
