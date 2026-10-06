# What to focus on now

Demo `/app` is one product case: **Brief → Cloth → Ask mill → Lock**. The factory side is **Book → Request**. Searching cites cloth from the mill file. It does not answer as the mill or lock product truth. The mill confirms current MOQ and lead. Lock happens only after that, and only if the cloth is available.

Under that case, nine apparel stages stay visible (`docs/STAGE_GATES.md`). Concept, materials, and the content label can clear from factory data. Pattern, sample, cutting, sewing, inspection, and shipping stay on the floor. Do not turn those into rooms.

The fifty-factory corpus and Lab stay on `/app/test`.

## Surfaces

| Surface | Path | Rule |
| --- | --- | --- |
| **Demo** | `/app` | The case above. Sign in, then walk it as the brand and as the mill. |
| **Test** | `/app/test` | Corpus, Lab, dialect playbooks — safe to break. |
| **Production site** | `fruma.vercel.app` | Same repo deploy. |

## Do this next

The next build is the ready item in `docs/agents/QUEUE.json`. A weekday Cursor Automation can pull it; the prompt is `docs/agents/STEWARD.md`.

1. **Mill's own file** — Factory → Book should take a real xlsx/csv, not only the built-in pilot workbook.
2. **Case survives restart** — after that file works. An open ask should still be there when the process restarts.
3. **One real mill workbook** — replace the pilot fixture when you have a genuine file.
4. **Postgres in staging** — set `DATABASE_URL` when maps and confirmations must survive multi-instance deploys (`docs/MEMORY_AND_DATABASE.md`).

## Explicitly not the focus yet

- MES / factory floor / proto / fit ownership
- Live retailer publishing
- Legal “one-click pass”
- Broad marketplace dashboards
- Stuffing the fifty-factory corpus into an LLM prompt
- Seeding Demo with all 50 Test factories
