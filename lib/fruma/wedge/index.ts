export {
  runWedgeSlice,
  resetWedgeForTests,
  hydrateHeaderOverlaysFromStore,
  persistPilotArtifacts,
} from "./slice";
export type { WedgeSliceResult } from "./slice";
export {
  askMill,
  answerDemoCase,
  emptyDemoCase,
  getDemoCase,
  lockDemoCase,
  resetDemoCase,
  resetDemoCasesForTests,
  sourceCloth,
} from "./case";
export type { DemoCaseView } from "./case";
