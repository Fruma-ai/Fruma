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
    why: "Dialect builtins already map Art. → article. Playbook is idle unless new silent headers appear.",
  },
  {
    dialect: "it-shirting",
    title: "Italian shirting playbook",
    why: "Dialect builtins cover Weave / Comp. / Wgt gsm / Min order. Confirm only leftovers.",
  },
  {
    dialect: "tr-knit",
    title: "Turkish knit playbook",
    why: "Dialect builtins cover Knit type, Fibre, Width cm, MOQ M. Confirm only leftovers.",
  },
  {
    dialect: "uk-imperial",
    title: "UK imperial playbook",
    why: "Dialect builtins cover Weight oz, Width \", MOQ yds. Units stay as written.",
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
