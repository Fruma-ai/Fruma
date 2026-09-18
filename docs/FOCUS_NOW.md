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

### 1. Corpus Harness + Mapping (live)
`/app/test?tab=agents` — run Harness, run Mapping, re-run Harness until 50/50.

### 2. Brand retrieval on Test data
For one Test brand product brief: structured filters → candidate shortlist → bounded match/evidence.

### 3. Persist the spine (when memory is not enough)
Postgres + object storage when confirmations must survive deploys. See `docs/MEMORY_AND_DATABASE.md`. **Not required yet.**

### 4. Promote Test → Demo (only when happy)
Copy accepted behaviour into `/app`.

## Explicitly not the focus yet

- MES / factory floor / proto / fit
- Live retailer publishing
- Legal “one-click pass”
- Broad marketplace dashboards
- Putting the whole corpus into an LLM prompt

## Your job vs the agent’s job

**You decide:** pilot brand/mill, what “done” looks like, when to promote, when to add Postgres, secrets/hosting.  
**Agents implement:** harness scoring, mapping proposals, branches/PRs on Test, then Demo promotion on request.
