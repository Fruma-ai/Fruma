export { runCorpusHarness } from "./corpus-harness";
export type { CorpusHarnessOutput, FactoryHarnessRow } from "./corpus-harness";
export { runMappingAgent, confirmMappingProposal, proposeSingleHeader } from "./mapping-agent";
export type { MappingAgentOutput } from "./mapping-agent";
export type { MappingProposal } from "./mapping-lexicon";
export { runRetrievalAgent } from "./retrieval-agent";
export type { RetrievalAgentOutput, ShortlistItem } from "./retrieval-agent";
export { runContinuityAgent, runMultiBrandContinuity } from "./continuity-agent";
export type {
  ContinuityAgentOutput,
  ContinuityException,
  BrandContinuitySlice,
} from "./continuity-agent";
export { runEvidenceAgent, assessClaim } from "./evidence-agent";
export type {
  EvidenceAgentOutput,
  ClaimAssessment,
  ClaimVerdict,
} from "./evidence-agent";
export { runMultiBrandIntelligence } from "./multi-brand";
export type { MultiBrandOutput, BrandIntelligenceSlice } from "./multi-brand";
export { briefFromProduct } from "./brief";
export type { ProductBrief, BriefRequirement } from "./brief";
export {
  listAgentRuns,
  latestAgentRun,
  getAgentRun,
  resetAgentRunsForTests,
} from "./run-store";
export type { StoredAgentRun, AgentFinding } from "./run-store";
export {
  confirmedHeaderOverlays,
  listConfirmedHeaderMappings,
  resetConfirmedHeadersForTests,
} from "./confirmed-headers";
