# What to focus on now

Dummy brands/factories are on `/app/test`. Demo agents in `/app` are still **UI choreography**. Status, measured corpus results, and next decisions: **`docs/WHERE_WE_ARE.md`**.

Test UI now has **Pilot** (workbook → confirm map → cited shortlist), **Overview health**, **dialect playbooks**, **Cloth mill books**, and **Source** matching fabrics that can become an end product. Use those. The next work is still the data + job spine — only on Test until you say promote.

## Protect production / demo

| Surface | Path | Rule |
| --- | --- | --- |
| **Demo** | `/app` | Customer story. Frozen until you explicitly promote. |
| **Test** | `/app/test` | Safe to break. Build agents and ingest here. |
| **Production site** | `fruma.vercel.app` | Same repo deploy — never merge experimental agent behaviour into Demo until Test is accepted. |

Use Test for all experiments. Preview deployments on feature branches are also safe sandboxes. Do not ask agents to “update the demo” until Test behaviour is right.

## Focus order (do this next)

### 1. Walk the Pilot slice on Test
`/app/test?tab=pilot` deposits a realistic mill XLSX, confirms dialect headers, and shortlists navy polo cloth **with cell citations**. This is the sellability path — not more agent chrome. Replace the fixture with a real mill workbook when you have one.

### 2. Harness the test corpus (Lab ingest is live; coverage is now visible)
Lab ingest on Test is real. Overview scores all 50 mill fabric books: **`pl-fleece` starts dark** because `Art.` is not an article alias. Confirm the Polish fleece playbook to recover those mills. Unmapped headers show as mapping work, not “no exceptions”. See `docs/WHERE_WE_ARE.md`.

### 3. Source shortlist with citations
Source already ranks mill fabric books for an end product. Matched fabrics and answerability now cite mill cells (sheet / column / row / header / value). Keep commercials historical until mill-confirmed.

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

**You decide:** merge PRs, pilot brand/mill workbook, Postgres, Promote, secrets/hosting.  
**Agent implements:** branches, PRs, Test-only experiments, then Demo promotion on request.
