# What to focus on now

Dummy brands/factories are on `/app/test`. Demo agents in `/app` are still **UI choreography**. Test now has real **Corpus Harness** and **Mapping** workers — see `docs/AGENT_STATUS.md`.

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

### 2. Colour MUST option + continuity across multi-brand
Tighten colour when brief names it; diff multi-brand snapshots.

### 3. Persist the spine (when memory is not enough)
Postgres when baselines must survive deploys. See `docs/MEMORY_AND_DATABASE.md`.

### 4. Promote Test → Demo (only when happy)
Copy accepted behaviour into `/app`.

## Explicitly not the focus yet

- MES / factory floor / proto / fit
- Live retailer publishing
- Legal “one-click pass”
- Broad marketplace dashboards
- Putting the whole corpus into an LLM prompt

## Your job vs the agent’s job

**You decide (rare):** merge PRs, promote Test→Demo, add Postgres, pilot mill, stop/go.  
**Build steward does (continuous):** next FOCUS_NOW item on Test, draft PRs, tests, findings with brand value.  

Low-touch operating model: `docs/STANDING_OPS.md`.

