# What to focus on now

Dummy brands/factories are on `/app/test`. Demo agents in `/app` are still **UI choreography**. Status: **`docs/WHERE_WE_ARE.md`**.

Test UI has **Overview**, **dialect playbooks**, **Cloth**, **Source**, and **Pilot** (shortlist + full wedge). Build only on Test until you say **Promote**.

## Protect production / demo

| Surface | Path | Rule |
| --- | --- | --- |
| **Demo** | `/app` | Customer story. Frozen until you explicitly promote. |
| **Test** | `/app/test` | Safe to break. Build the spine here. |
| **Production site** | `fruma.vercel.app` | Same repo deploy — never merge experimental agent behaviour into Demo until Test is accepted. |

## Focus order

### Done on the Test wedge branch
1. Unknown-header ingest exceptions (silent columns are mapping work).
2. Pilot workbook → confirmed map → cited shortlist.
3. Anonymous mill request + timestamped commercial confirmation.
4. Locked versioned product-truth record (`product-truth.ts` wired).
5. Durable spine — file store by default; Postgres when `DATABASE_URL` is set. See `docs/MEMORY_AND_DATABASE.md`.

### Do this next
1. **Walk the Pilot tab** — Run full wedge on `/app/test?tab=pilot`. Confirm brand is absent from the mill view and commercials flip historical → confirmed.
2. **One real mill workbook** — replace the pilot fixture with a genuine file; keep Demo frozen.
3. **Postgres in staging** — set `DATABASE_URL` when maps/confirmations must survive multi-instance deploys.
4. **Promote** — copy accepted Test behaviour into `/app` only when you say Promote.

## Explicitly not the focus yet

- MES / factory floor / proto / fit
- Live retailer publishing
- Legal “one-click pass”
- Broad marketplace dashboards
- Putting the whole corpus into an LLM prompt
- Unfreezing Demo without Promote

## Your job vs the agent’s job

**You decide:** real workbook, Postgres hosting, Promote.  
**Agent implements:** Test-only spine, PRs, then Demo promotion on request.
