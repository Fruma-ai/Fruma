# Standing ops — low-touch agent work for Owen (CTO)

Goal: **agents keep building Fruma while Owen only decides, reviews, and promotes.**

## Two kinds of agents

| Kind | Where | Job |
| --- | --- | --- |
| **Product agents** | `/app/test?tab=agents` | Harness, Mapping, Retrieval, Continuity, Evidence — sourcing intelligence on Test data |
| **Build steward** | Cursor Cloud Agent | Pull `nextStewardPull()` from `lib/fruma/agents/steward-queue.ts`; open draft PRs on Test; never touch Demo |

Unattended runs: **one-time** Automations save — `docs/CURSOR_AUTOMATIONS.md`. Queue + Cursor rules live in the repo even before that save.

## Owen’s touchpoints (only these)

1. **Merge or reject** draft PRs (or say “merge #N”)
2. **Decide stage gates:** promote Test→Demo, add Postgres, pick pilot mill
3. **Spot-check** Agents tab when the steward flags a finding
4. **One-word continues:** “Go” / “Stop” / “Promote” / “Postgres”
5. **Once:** save the weekday Automation so the steward runs without a prompt

Everything else is steward-owned: implement `nextStewardPull()`, run tests, update docs, report findings with brand-value implication.

## Standing prompt (paste into any new Cloud Agent or Automation)

```
You are Fruma’s build steward for Owen (CTO).
Read lib/fruma/agents/steward-queue.ts and take nextStewardPull().
Also read docs/CTO_NORTH_STAR.md, docs/FOCUS_NOW.md, docs/AGENT_STATUS.md, docs/STANDING_OPS.md, docs/CURSOR_AUTOMATIONS.md.
Work only on /app/test and /api/test. Never change Demo /app unless Owen says Promote.
If nextStewardPull() is null, stop — do not invent a Postgres or Demo-promotion task.
Open or update a draft PR. Run npm test.
Reply with: Progress · Key findings · Brand value · What you need from Owen (max 1 decision).
Do not invent fibre/origin/certs/commercials, leak brand-private memory, or broaden into MES/PLM.
```

Canonical copy: `STEWARD_PROMPT` in `lib/fruma/agents/steward-queue.ts`.

## Cadence

| Cadence | Who | What |
| --- | --- | --- |
| **Weekday 07:30 London** | Cursor Automation | Pull next queue item, draft PR, short status |
| **Issue labelled steward** | Cursor Automation | Bounded task from the issue body |
| **On every PR** | GitHub CI | `npm test` must pass |
| **Weekly** | Owen (5–10 min) | Review open draft PRs + Agents findings; merge or redirect |
| **On demand** | Owen | “Go” / “Promote” / “Postgres” / file a Steward task issue |

## Guardrails (non-negotiable)

- Test only until explicit **Promote**
- Agents propose; never invent fibre/origin/certs/commercials
- Brand-private memory never leaks
- Prefer data/job spine over new UI chrome
- One PR theme at a time; keep Demo frozen

## Backlog the steward may pull without asking

Source of truth: `lib/fruma/agents/steward-queue.ts` (`nextStewardPull()`).

Currently first ready: **commercial freshness on Retrieval** (hanger MOQ/lead are historical until mill-confirmed). Then Brief as Agents step 0.

Stop and ask before: Postgres, Demo promotion, real mill file ingest, public API changes.

## What “done” looks like for a steward turn

- Branch pushed, draft PR open/updated
- `npm test` green
- Queue item marked `done` if finished; `AGENT_STATUS.md` updated if behaviour changed
- Status message to Owen ≤ 12 lines with **one** ask if needed
