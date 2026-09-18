export { runCorpusHarness } from "./corpus-harness";
export type { CorpusHarnessOutput, FactoryHarnessRow } from "./corpus-harness";
export { runMappingAgent, confirmMappingProposal, proposeSingleHeader } from "./mapping-agent";
export type { MappingAgentOutput } from "./mapping-agent";
export type { MappingProposal } from "./mapping-lexicon";
export { runRetrievalAgent } from "./retrieval-agent";
export type { RetrievalAgentOutput, ShortlistItem } from "./retrieval-agent";
export { runContinuityAgent } from "./continuity-agent";
export type { ContinuityAgentOutput, ContinuityException } from "./continuity-agent";
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
