# Agent status (Test surface)

Live workers on `/app/test?tab=agents`. Demo `/app` is untouched.

Standing CTO brief: `docs/CTO_NORTH_STAR.md`.

## Live now

| Agent | Job | Status |
| --- | --- | --- |
| **Corpus Harness** | Deposit all 50 Test factory hangers; score by dialect; list unmapped headers | Live |
| **Mapping** | Propose / auto-confirm high-confidence dialect headers | Live |
| **Retrieval** | Northline brief → structured filters → evidence-linked shortlist (private memory reorders; exclusions hidden) | Live |
| **CI** | `npm test` on every PR | Live |

## Key findings

### Harness → Mapping
- Before Mapping: **42/50** ok · **pl-fleece** failed on `Art.` article header
- After Mapping: **50/50** ok · 19 dialect aliases confirmed

### Retrieval (Northline) — brand value proof
Measured on `Refined navy polo` (TST-LINE-1006):

- **12** deep-match qualities from preferred mills (Lima Group, Brescia Works)
- **3** excluded mills never shown
- **40** structured candidates capped before deep match
- Evidence on #1 is explicit: UK market ✓, warp-knit specialty ✓, MOQ 365m ✓, colour Ecru ≠ navy (PREFER miss shown), cert ISO 14001 needs scope confirm, private **preferred** relationship ✓
- **CTO note:** relationship memory correctly dominates ordering; colour is PREFER so non-navy rows can still rank high — evidence keeps that honest for the brand

## Next agents

1. **Continuity** — diff harness/retrieval vs last run; exceptions only
2. **Evidence** — scope/issuer checks on cert strings
3. **Build steward** — standing Cursor agent on Test backlog
4. **Multi-brand retrieval** — Harbour + Field & Form same path

## How Owen uses this

1. `/app/test?tab=agents`
2. Harness → Mapping → **Retrieval (Northline)**
3. Read **Brand value** bullets + shortlist evidence on #1
