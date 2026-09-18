# Agent status (Test surface)

Live workers on `/app/test?tab=agents`. Demo `/app` is untouched.

Standing ops: `docs/STANDING_OPS.md` · CTO brief: `docs/CTO_NORTH_STAR.md`

## Live now

| Step | Agent | Status |
| --- | --- | --- |
| 1 | Harness | Live |
| 2 | Mapping | Live |
| 3 | Retrieval (brand picker) | Live |
| 4 | Continuity | Live |
| 5 | Evidence | Live |
| 6 | **All brands** (Northline + Harbour + Field & Form) | Live |
| — | CI + weekday steward timer | Live |

## Multi-brand findings (tenant moat)

| Brand | Product | Shortlist | Excluded hidden | Evidence not brand-safe | Colour |
| --- | --- | --- | --- | --- | --- |
| Northline Studio | Refined navy polo | navy MUST shortlist | 3 | all audited claims | MUST navy |
| Harbour Standard | (T-shirt default) | navy MUST shortlist | 3 | all audited claims | MUST navy |
| Field & Form | (Jacket default) | navy MUST shortlist | 3 | all audited claims | MUST navy |

- Same mill (`factory-001`) can carry **different private relationships** per brand
- No brand ever sees another brand’s preferred/excluded set
- **Colour:** named colourway in brief → **MUST** (mismatch rows ineligible); unnamed → **OPEN** (never invent navy)
- **Brand pitch:** one catalogue spine, three private intelligence views

## Next steward pulls

1. Continuity across multi-brand snapshots  
2. Ask Owen before Postgres / Demo promote  

## How Owen uses this

`/app/test?tab=agents` → pick brand for 3–5, or hit **6. All brands**. Merge draft PRs when ready.
