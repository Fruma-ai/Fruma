/**
 * Machine-readable work queue for Cloud Agents that continue when Owen is away.
 * First ready item (`nextStewardPull`) is the only task a steward may start
 * without asking. Blocked items require an Owen decision.
 */

export type StewardTaskStatus = "ready" | "blocked" | "done";
export type StewardOwner = "steward" | "owen";

export type StewardTask = {
  id: string;
  title: string;
  status: StewardTaskStatus;
  owner: StewardOwner;
  brandValue: string;
  pull: string;
  stopIf?: string;
};

/** Paste into a new Cloud Agent or a Cursor Automation. */
export const STEWARD_PROMPT = `You are Fruma’s build steward for Owen (CTO).
Read lib/fruma/agents/steward-queue.ts and take nextStewardPull().
Also read docs/CTO_NORTH_STAR.md, docs/FOCUS_NOW.md, docs/AGENT_STATUS.md, docs/STANDING_OPS.md, docs/CURSOR_AUTOMATIONS.md.
Work only on /app/test and /api/test. Never change Demo /app unless Owen says Promote.
If nextStewardPull() is null, stop — do not invent a Postgres or Demo-promotion task.
Open or update a draft PR. Run npm test.
Reply with: Progress · Key findings · Brand value · What you need from Owen (max 1 decision).
Do not invent fibre/origin/certs/commercials, leak brand-private memory, or broaden into MES/PLM.`;

/**
 * Ordered queue. Stewards pull the first `ready` item.
 * Mark an item `done` in the same PR that finishes it, then the next ready item unlocks.
 */
export const STEWARD_QUEUE: readonly StewardTask[] = [
  {
    id: "test-agent-loop",
    title: "Test product agents (Harness → Mapping → Retrieval → Continuity → Evidence → All brands)",
    status: "done",
    owner: "steward",
    brandValue: "Sourcing intelligence on Test data with tenant-private memory.",
    pull: "Live on /app/test?tab=agents. Do not re-implement.",
  },
  {
    id: "unattended-steward",
    title: "Unattended build steward (queue, Cursor rules, Automations playbook, CI)",
    status: "done",
    owner: "steward",
    brandValue: "Work continues when Owen is away; he only merges, promotes, or stops.",
    pull: "Live. Owen still needs a one-time Automations save — see docs/CURSOR_AUTOMATIONS.md.",
  },
  {
    id: "commercial-freshness",
    title: "Mark Retrieval commercials as historical until mill-confirmed",
    status: "ready",
    owner: "steward",
    brandValue:
      "Brands will not treat hanger MOQ / lead as current supply terms. Honest commercials, safer shortlists.",
    pull:
      "On Test Retrieval/Evidence only: hanger MOQ and lead stay visible as historical/stale unless a mill confirmation timestamp exists. Never invent current price or lead. Add tests. Demo stays frozen.",
    stopIf: "Would require Postgres, a live mill API, or Demo promotion.",
  },
  {
    id: "brief-as-agent-step",
    title: "Expose Brief as Agents step 0 (MUST / PREFER / OPEN)",
    status: "ready",
    owner: "steward",
    brandValue: "Designers see answerable requirements before a mill shortlist is ranked.",
    pull:
      "Wire lib/fruma/agents/brief.ts as a Test agent run + Agents tab step, citing product fields. Do not send the whole corpus to a model.",
  },
  {
    id: "postgres",
    title: "Persist ingest + agent runs in Postgres",
    status: "blocked",
    owner: "owen",
    brandValue: "Confirmed mappings and audits survive deploys.",
    pull: "See docs/MEMORY_AND_DATABASE.md.",
    stopIf: "Owen has not said Postgres.",
  },
  {
    id: "promote-demo",
    title: "Promote accepted Test behaviour into Demo /app",
    status: "blocked",
    owner: "owen",
    brandValue: "Customer story inherits proven sourcing intelligence.",
    pull: "Copy accepted Test behaviour into Demo only after Owen says Promote.",
    stopIf: "Owen has not said Promote.",
  },
];

export function listStewardQueue(): StewardTask[] {
  return STEWARD_QUEUE.map((task) => ({ ...task }));
}

export function nextStewardPull(): StewardTask | null {
  return STEWARD_QUEUE.find((task) => task.status === "ready" && task.owner === "steward") ?? null;
}

export function blockedOnOwen(): StewardTask[] {
  return STEWARD_QUEUE.filter((task) => task.status === "blocked" && task.owner === "owen").map(
    (task) => ({ ...task }),
  );
}
