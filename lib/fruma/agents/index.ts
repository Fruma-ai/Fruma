export { runCorpusHarness } from "./corpus-harness";
export type { CorpusHarnessOutput, FactoryHarnessRow } from "./corpus-harness";
export { runMappingAgent, confirmMappingProposal, proposeSingleHeader } from "./mapping-agent";
export type { MappingAgentOutput } from "./mapping-agent";
export type { MappingProposal } from "./mapping-lexicon";
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
