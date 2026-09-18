# What to focus on now

Dummy brands/factories are on `/app/test`. Demo agents in `/app` are still **UI choreography**. Status, measured corpus results, and next decisions: **`docs/WHERE_WE_ARE.md`**. The next work is the data + job spine — only on Test until you say promote.

Draft [PR #34](https://github.com/Fruma-ai/Fruma/pull/34) already runs Harness → Mapping → Retrieval → Continuity → Evidence on Test. Merge that rather than rebuilding it here.

## Protect production / demo

| Surface | Path | Rule |
| --- | --- | --- |
| **Demo** | `/app` | Customer story. Frozen until you explicitly promote. |
| **Test** | `/app/test` | Safe to break. Build agents and ingest here. |
| **Production site** | `fruma.vercel.app` | Same repo deploy — never merge experimental agent behaviour into Demo until Test is accepted. |

Use Test for all experiments. Preview deployments on feature branches are also safe sandboxes. Do not ask agents to “update the demo” until Test behaviour is right.

## Focus order (do this next)

### 1. Harness the test corpus (Lab ingest is live; coverage is not)
Lab ingest on Test is real. On `main`, all 50 CSVs parse, but **`pl-fleece` (8 mills) yields zero qualities** because `Art.` is not an article alias. Unmapped headers are silent. See `docs/WHERE_WE_ARE.md`. Do not treat “ingests without throwing” as done.

### 2. First bounded agent: Mapping
On `main` this is still types only (`lib/fruma/agent-runtime.ts`). On PR #34 it is live: lexicon proposals for the 19 silent headers, confirm required, no invented fields. Merge #34 instead of rewriting.

### 3. Brand retrieval on Test data
On PR #34: structured shortlist (12 mills), private preferred/proven reorder, exclusions hidden, named colour = MUST. Next after merge: **commercial freshness** (hanger MOQ/lead historical until mill-confirmed), then Brief as step 0.

### 4. Persist the spine (when local in-memory is not enough)
Postgres + object storage + job queue for the same path above. One real mill workbook + one brand is enough for the first production vertical slice. Owen says **Postgres**. See `docs/PLATFORM_REVIEW.md`.

### 5. Promote Test → Demo (only when happy)
Copy accepted behaviour into `/app`. Owen says **Promote**. Leave the fifty-factory corpus on Test unless you intentionally want a marketplace demo story.

## Explicitly not the focus yet

- MES / factory floor / proto / fit
- Live retailer publishing
- Legal “one-click pass”
- Broad marketplace dashboards
- Putting the whole corpus into an LLM prompt

## Your job vs the agent’s job

**You decide:** merge #34, pilot brand/mill, Postgres, Promote, secrets/hosting.  
**Agent implements:** branches, PRs, Test-only experiments, then Demo promotion on request.
