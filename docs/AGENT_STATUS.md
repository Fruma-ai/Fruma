# Agent status (Test surface)

Live workers on `/app/test?tab=agents`. Demo `/app` is untouched.

Standing ops: `docs/STANDING_OPS.md` · CTO brief: `docs/CTO_NORTH_STAR.md`

## Live now

| Step | Agent | Status |
| --- | --- | --- |
| 1 | Harness | Live |
| 2 | Mapping | Live |
| 3 | Retrieval (brand picker + colour MUST when named) | Live |
| 4 | Continuity (per-brand baselines + **All brands**) | Live |
| 5 | Evidence | Live |
| 6 | **All brands** (Northline + Harbour + Field & Form) | Live |
| — | CI + weekday steward timer | Live |

## Multi-brand findings (tenant moat)

| Brand | Product | Shortlist | Excluded hidden | Evidence not brand-safe | Colour |
| --- | --- | --- | --- | --- | --- |
| Northline Studio | Refined navy polo | 12 | 3 | all audited claims | MUST navy |
| Harbour Standard | Refined navy t-shirt | 12 | 3 | all audited claims | MUST navy |
| Field & Form | Refined navy jacket | 12 | 3 | all audited claims | MUST navy |

- Same mill (`factory-001`) can carry **different private relationships** per brand
- No brand ever sees another brand’s preferred/excluded set
- **Colour:** named colourway in brief → **MUST** (mismatch rows ineligible); unnamed → **OPEN** (never invent navy)
- **Continuity:** retrieval snapshots are **brand-scoped** — switching Harbour ↔ Field & Form ↔ Northline never diffs another tenant’s shortlist; All brands mode diffs shared harness once + each brand against its own prior pair (0 cross-brand retrieval diffs)
- **Brand pitch:** one catalogue spine, three private intelligence views, exception-only rebuy per tenant

## Next steward pulls

1. ~~Continuity/Evidence polish~~ — 81 tests green on steward turn 2026-09-21; no failures to polish
2. **Ask Owen:** merge draft PR #33 and/or **Promote** / **Postgres** (steward stops here per STANDING_OPS)

## How Owen uses this

`/app/test?tab=agents` → pick brand for 3–5, or Continuity with **All brands**, or hit **6. All brands**. Merge draft PRs when ready.

### Steward turn 2026-09-21
- Confirmed FOCUS items 1–3 done (multi-brand, colour MUST, multi-brand Continuity)
- `npm test`: **81 pass / 0 fail**
- No Demo changes
- Next gate is Owen-owned (merge / Promote / Postgres)

### Steward turn 2026-09-22
- Re-checked: PR #33 still **draft**, mergeable, CI + Vercel **green**
- `npm test`: **81 pass / 0 fail** again
- No unfinished steward-owned FOCUS items — still waiting on Owen gate
- Demo untouched

### Steward turn 2026-09-23
- Third reconfirm: PR #33 draft + mergeable; CI/Vercel green; **81/81** tests pass
- Steward-owned backlog still empty — blocked on Owen merge / Promote / Postgres
- No Demo changes; weekday timer remains armed unless Owen says **Stop**
