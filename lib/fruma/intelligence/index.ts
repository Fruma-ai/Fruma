export { scoreCorpusCoverage, scoreFactoryCoverage } from "./coverage";
export type { CorpusCoverage, CoverageStatus, DialectCoverage, FactoryCoverage } from "./coverage";
export { proposeFieldForHeader, PROPOSAL_LEXICON } from "./mapping-lexicon";
export type { MappingProposal } from "./mapping-lexicon";
export {
  confirmHeaders,
  confirmLexiconForHeaders,
  confirmedHeaderOverlays,
  resetHeaderOverlaysForTests,
} from "./overlays";
export { briefFromProduct, sourceShortlist, tenantIsolationProof } from "./retrieval";
export type { BrandBrief, EvidenceFlag, SourceCandidate, SourceShortlist } from "./retrieval";
export { DIALECT_PLAYBOOKS, playbookHeaders, playbookReady } from "./playbooks";
