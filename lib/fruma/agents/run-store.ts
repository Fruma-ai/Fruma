import { randomUUID } from "node:crypto";
import type { AgentKind, AgentRun, AgentRunStatus } from "../agent-runtime";
import type { FrumaVersion } from "../versions";
import { TEST_SURFACE } from "../surfaces";

export type AgentFinding = {
  severity: "info" | "warn" | "block";
  code: string;
  message: string;
  factoryId?: string;
  dialect?: string;
  header?: string;
};

export type StoredAgentRun<TInput = unknown, TOutput = unknown> = AgentRun<TInput, TOutput> & {
  surface: FrumaVersion;
  findings: AgentFinding[];
  summary: string;
};

const runs: StoredAgentRun[] = [];
const MAX_RUNS = 200;

export function listAgentRuns(limit = 20): StoredAgentRun[] {
  return runs.slice(0, Math.max(1, Math.min(limit, MAX_RUNS)));
}

export function latestAgentRun(kind?: AgentKind): StoredAgentRun | undefined {
  if (!kind) return runs[0];
  return runs.find((r) => r.kind === kind);
}

export function getAgentRun(id: string): StoredAgentRun | undefined {
  return runs.find((r) => r.id === id);
}

export function createAgentRun<TInput, TOutput>(args: {
  organisationId: string;
  kind: AgentKind;
  idempotencyKey: string;
  input: TInput;
  surface?: FrumaVersion;
  sourcePointers?: AgentRun["sourcePointers"];
}): StoredAgentRun<TInput, TOutput> {
  const existing = runs.find(
    (r) => r.kind === args.kind && r.idempotencyKey === args.idempotencyKey && r.status === "running",
  );
  if (existing) return existing as StoredAgentRun<TInput, TOutput>;

  const run: StoredAgentRun<TInput, TOutput> = {
    id: randomUUID(),
    organisationId: args.organisationId,
    kind: args.kind,
    idempotencyKey: args.idempotencyKey,
    status: "running",
    input: args.input,
    sourcePointers: args.sourcePointers ?? [],
    attempt: 1,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    surface: args.surface ?? TEST_SURFACE,
    findings: [],
    summary: "",
  };
  runs.unshift(run as StoredAgentRun);
  if (runs.length > MAX_RUNS) runs.length = MAX_RUNS;
  return run;
}

export function finishAgentRun<TOutput>(
  run: StoredAgentRun,
  args: {
    status: AgentRunStatus;
    output?: TOutput;
    findings?: AgentFinding[];
    summary: string;
    errorCode?: string;
  },
): StoredAgentRun {
  run.status = args.status;
  run.output = args.output;
  run.findings = args.findings ?? [];
  run.summary = args.summary;
  run.errorCode = args.errorCode;
  run.completedAt = new Date().toISOString();
  return run;
}

/** Test helper — wipe in-memory agent history. */
export function resetAgentRunsForTests() {
  runs.length = 0;
}
