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
`/app/test?tab=agents` — Harness → Mapping → Retrieval → Continuity → **Evidence**.

### 2. Multi-brand + colour MUST option
Harbour / Field & Form shortlists; tighten colour when brief names it.

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

**You decide:** pilot brand/mill, what “done” looks like, when to promote, when to add Postgres, secrets/hosting.  
**Agents implement:** harness scoring, mapping proposals, branches/PRs on Test, then Demo promotion on request.
