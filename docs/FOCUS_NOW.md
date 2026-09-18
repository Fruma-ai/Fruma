# What to focus on now

Dummy brands/factories are on `/app/test`. Demo agents in `/app` are still **UI choreography**. The next work is the data + job spine — only on Test until you say promote.

## Protect production / demo

| Surface | Path | Rule |
| --- | --- | --- |
| **Demo** | `/app` | Customer story. Frozen until you explicitly promote. |
| **Test** | `/app/test` | Safe to break. Build agents and ingest here. |
| **Production site** | `fruma.vercel.app` | Same repo deploy — never merge experimental agent behaviour into Demo until Test is accepted. |

Use Test for all experiments. Preview deployments on feature branches are also safe sandboxes. Do not ask agents to “update the demo” until Test behaviour is right.

## Focus order (do this next)

### 1. Harness the test corpus (now)
Wire factory hanger CSVs through real ingest on **Test only**:
immutable file → source rows → mapping exceptions → searchable qualities.

Prove that 50 factory dialects can land without touching `/app`.

### 2. First bounded agent: Mapping
Not a chatbot over the whole corpus. After deterministic normalisation, a **Mapping agent** proposes mappings for unknown mill vocabulary, cites source field IDs, and waits for human/mill confirm. Runs are auditable and resumable (`lib/fruma/agent-runtime.ts`).

### 3. Brand retrieval on Test data
For one Test brand product brief: structured filters → candidate shortlist → bounded match/evidence. Relationship memory (preferred / proven / excluded) may reorder; it must never invent facts.

### 4. Persist the spine (when local in-memory is not enough)
Postgres + object storage + job queue for the same path above. One real mill workbook + one brand is enough for the first production vertical slice. See `docs/PLATFORM_REVIEW.md`.

### 5. Promote Test → Demo (only when happy)
Copy accepted behaviour into `/app`. Leave the fifty-factory corpus on Test unless you intentionally want a marketplace demo story.

## Explicitly not the focus yet

- MES / factory floor / proto / fit
- Live retailer publishing
- Legal “one-click pass”
- Broad marketplace dashboards
- Putting the whole corpus into an LLM prompt

## Your job vs the agent’s job

**You decide:** pilot brand/mill, what “done” looks like, when to promote, secrets/hosting.  
**Agent implements:** branches, PRs, Test-only experiments, then Demo promotion on request.
