# Standing ops — low-touch agent work for Owen (CTO)

Goal: **agents keep building Fruma while Owen only decides, reviews, and promotes.**

## Two kinds of agents

| Kind | Where | Job |
| --- | --- | --- |
| **Product agents** | `/app/test?tab=agents` | Harness, Mapping, Retrieval, Continuity, Evidence — improve sourcing intelligence on Test data |
| **Build steward** | Cursor Cloud Agent | Read this file + `CTO_NORTH_STAR.md` + `FOCUS_NOW.md`; open draft PRs on Test; never touch Demo |

## Owen’s touchpoints (only these)

1. **Merge or reject** draft PRs (or say “merge #N”)
2. **Decide stage gates:** promote Test→Demo, add Postgres, pick pilot mill
3. **Spot-check** Agents tab when the steward flags a finding
4. **One-word continues:** “Go” / “Stop” / “Promote” / “Postgres”

Everything else is steward-owned: implement next FOCUS_NOW item, run tests, update docs, report findings with brand-value implication.

## Standing prompt (paste into any new Cloud Agent)

```
You are Fruma’s build steward for Owen (CTO).
Read docs/CTO_NORTH_STAR.md, docs/FOCUS_NOW.md, docs/AGENT_STATUS.md, docs/STANDING_OPS.md.
Work only on /app/test. Never change Demo /app unless Owen says Promote.
Advance the next FOCUS_NOW item. Open/update a draft PR. Run npm test.
Reply with: Progress · Key findings · Brand value · What you need from Owen (max 1 decision).
If blocked, stop and ask one clear question — do not invent product facts or broaden into MES/PLM.
```

## Cadence

| Cadence | Who | What |
| --- | --- | --- |
| **Daily / scheduled** | Build steward timer | Pull latest, advance next FOCUS item, draft PR, short status |
| **On every PR** | GitHub CI | `npm test` must pass |
| **Weekly** | Owen (5–10 min) | Review open draft PRs + Agents findings; merge or redirect |
| **On demand** | Owen | “Go” / “Promote” / “Postgres” |

## Guardrails (non-negotiable)

- Test only until explicit **Promote**
- Agents propose; never invent fibre/origin/certs/commercials
- Brand-private memory never leaks
- Prefer data/job spine over new UI chrome
- One PR theme at a time; keep Demo frozen

## Backlog the steward may pull without asking

In order from `FOCUS_NOW.md` (skip if already done):

1. Multi-brand Retrieval + Evidence (Harbour, Field & Form)
2. Optional MUST colour when brief names a colourway
3. Continuity/Evidence polish from test failures
4. Docs/findings updates after each agent run
5. Stop and ask before: Postgres, Demo promotion, real mill file ingest, public API changes

Default next pull if FOCUS is stale: **optional MUST colour when brief names a colourway**.

## What “done” looks like for a steward turn

- Branch pushed, draft PR open/updated
- `npm test` green
- `AGENT_STATUS.md` / findings updated if behaviour changed
- Status message to Owen ≤ 12 lines with **one** ask if needed
