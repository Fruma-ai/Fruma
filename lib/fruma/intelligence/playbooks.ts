import type { HangerDialect } from "../test-corpus/types";
import { proposeFieldForHeader } from "./mapping-lexicon";
import type { CorpusCoverage } from "./coverage";

/** One confirm should recover every mill that shares the dialect. */
export const DIALECT_PLAYBOOKS: {
  dialect: HangerDialect;
  title: string;
  why: string;
}[] = [
  {
    dialect: "pl-fleece",
    title: "Polish fleece playbook",
    why: "Art. is not an article alias. Confirm once; all dark PL mills become searchable.",
  },
  {
    dialect: "it-shirting",
    title: "Italian shirting playbook",
    why: "Weave / Comp. / Wgt gsm / Min order stay silent. Rows exist; most fields never reach the standard.",
  },
  {
    dialect: "tr-knit",
    title: "Turkish knit playbook",
    why: "Knit type, Fibre, Width cm, MOQ M are mill vocabulary, not Fruma fields, until confirmed.",
  },
  {
    dialect: "uk-imperial",
    title: "UK imperial playbook",
    why: "Weight oz, Width \", MOQ yds need mapping. Units stay as written until a later confirm.",
  },
];

export function playbookHeaders(coverage: CorpusCoverage, dialect: HangerDialect): string[] {
  const row = coverage.byDialect.find((d) => d.dialect === dialect);
  return row?.unmappedHeaders ?? [];
}

export function playbookReady(coverage: CorpusCoverage, dialect: HangerDialect): boolean {
  const headers = playbookHeaders(coverage, dialect);
  if (!headers.length) return false;
  return headers.every((header) => proposeFieldForHeader(header).proposedField !== null);
}
