# What to focus on now

Dummy brands/factories are on `/app/test`. Demo agents in `/app` are still **UI choreography**. Test now has real product agents **and** a build steward that can continue when Owen is away.

## Protect production / demo

| Surface | Path | Rule |
| --- | --- | --- |
| **Demo** | `/app` | Customer story. Frozen until you explicitly promote. |
| **Test** | `/app/test` | Safe to break. Build agents and ingest here. |
| **Production site** | `fruma.vercel.app` | Same repo deploy — never merge experimental agent behaviour into Demo until Test is accepted. |

Use Test for all experiments. Preview deployments on feature branches are also safe sandboxes. Do not ask agents to “update the demo” until Test behaviour is right.

## Focus order

### 1. Full Test agent loop (live)
`/app/test?tab=agents` — Harness → Mapping → Retrieval → Continuity → Evidence → **All brands**.

### 2. Unattended steward (live in repo; Automation is one Owen save)
Queue: `lib/fruma/agents/steward-queue.ts`. Rules: `.cursor/rules/fruma-steward.mdc`. How to keep running overnight: `docs/CURSOR_AUTOMATIONS.md`.

### 3. Next steward pull (no ask)
Commercial freshness on Retrieval — hanger MOQ / lead stay historical until mill-confirmed. Then Brief as Agents step 0.

### 4. Persist the spine (when memory is not enough)
Postgres when baselines must survive deploys. Owen says **Postgres**. See `docs/MEMORY_AND_DATABASE.md`.

### 5. Promote Test → Demo (only when happy)
Copy accepted behaviour into `/app`. Owen says **Promote**.

## Explicitly not the focus yet

- MES / factory floor / proto / fit
- Live retailer publishing
- Legal “one-click pass”
- Broad marketplace dashboards
- Putting the whole corpus into an LLM prompt

## Your job vs the agent’s job

**You decide (rare):** merge PRs, promote Test→Demo, add Postgres, pilot mill, stop/go, save the weekday Automation once.  
**Build steward does (continuous):** `nextStewardPull()` on Test, draft PRs, tests, findings with brand value.

Low-touch operating model: `docs/STANDING_OPS.md`.
