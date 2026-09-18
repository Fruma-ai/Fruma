# Agent status (Test surface)

Live workers on `/app/test?tab=agents`. Demo `/app` is untouched.

Standing ops: `docs/STANDING_OPS.md` · Unattended setup: `docs/CURSOR_AUTOMATIONS.md` · CTO brief: `docs/CTO_NORTH_STAR.md`

## Live now

| Step | Agent | Status |
| --- | --- | --- |
| 1 | Harness | Live |
| 2 | Mapping | Live |
| 3 | Retrieval (brand picker + colour MUST when named) | Live |
| 4 | Continuity (per-brand baselines + **All brands**) | Live |
| 5 | Evidence | Live |
| 6 | **All brands** (Northline + Harbour + Field & Form) | Live |
| — | Build steward queue + Cursor rules + CI | Live |
| — | Weekday Cursor Automation | Owen saves once — see `docs/CURSOR_AUTOMATIONS.md` |

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

Source of truth: `nextStewardPull()` in `lib/fruma/agents/steward-queue.ts`.

1. Commercial freshness on Retrieval (hanger MOQ/lead historical until mill-confirmed)
2. Brief as Agents step 0 (MUST / PREFER / OPEN)
3. Ask Owen before Postgres / Demo promote

## How Owen uses this

`/app/test?tab=agents` → pick brand for 3–5, or Continuity with **All brands**, or hit **6. All brands**. Merge draft PRs when ready. Save the weekday Automation once so this continues when you are away.
