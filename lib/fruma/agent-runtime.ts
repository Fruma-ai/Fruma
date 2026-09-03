import type { ProductTruthFact } from "./product-truth";

export type AgentKind =
  | "ingest"
  | "mapping"
  | "brief"
  | "continuity"
  | "retrieval"
  | "match"
  | "evidence"
  | "commercial"
  | "destination";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "needs-review"
  | "succeeded"
  | "failed"
  | "cancelled";

/** A pointer, never a copy of an entire corpus. */
export type SourcePointer = {
  organisationId: string;
  sourceRecordId: string;
  sourceVersion?: number;
  fields?: string[];
};

export type AgentRun<TInput = unknown, TOutput = unknown> = {
  id: string;
  organisationId: string;
  kind: AgentKind;
  idempotencyKey: string;
  status: AgentRunStatus;
  input: TInput;
  output?: TOutput;
  sourcePointers: SourcePointer[];
  parentRunId?: string;
  attempt: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorCode?: string;
};

export type RetrievalInput = {
  sourcingCaseId: string;
  requirementIds: string[];
  eligibleMillIds?: string[];
  excludedMillIds?: string[];
  /** Hard upper bound before deep model evaluation. */
  candidateLimit: number;
};

export type RetrievalCandidate = {
  sourceRecordId: string;
  millId: string;
  qualityId: string;
  structuredEligibility: "eligible" | "ineligible" | "unknown";
  retrievalScore?: number;
  relationshipSignal?: "previously-used" | "proven" | "preferred" | "none";
};

export type MatchEvidence = {
  requirementId: string;
  sourceRecordId: string;
  sourceField?: string;
  result: "evidenced" | "mismatch" | "needs-confirmation" | "not-on-file" | "physical-only";
  explanation: string;
};

export type MatchOutput = {
  candidateId: string;
  evidence: MatchEvidence[];
  factsProduced: ProductTruthFact[];
};

export const DEFAULT_AGENT_LIMITS = {
  retrievalCandidates: 40,
  deepMatchCandidates: 12,
  sourcePointersPerRun: 100,
} as const;

/**
 * Runtime invariant: an agent receives bounded source pointers after retrieval.
 * It must never receive a tenant's whole source corpus as model context.
 */
export function assertBoundedRun(run: AgentRun) {
  if (run.sourcePointers.length > DEFAULT_AGENT_LIMITS.sourcePointersPerRun) {
    throw new Error("AGENT_SOURCE_BOUND_EXCEEDED");
  }
}
