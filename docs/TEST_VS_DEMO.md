# Test vs demo versions

Fruma keeps two surfaces so engineering work does not quietly rewrite the customer demo.

| Version | Path | Purpose |
| --- | --- | --- |
| **Demo** | `/app` | Customer-facing story **with promoted spine** (real wedge on Source / Confirm / Standardise + Factory Setup). |
| **Test** | `/app/test` | Three dummy brands + fifty mills with private fabric/material CSVs. Safe to break. |

## Environment protection

1. **Experiments stay on Test** — corpus, Lab, dialect playbooks, new agents under `/app/test` and `/api/test/*`.
2. **Demo spine is promoted, not frozen** — Source / Confirm / Standardise call `/api/demo/wedge` on `DEMO_SURFACE`. Intent / Concept / Development / Channel-ready remain narrative scaffolding.
3. **Separate server memory** — mill ingest engines and durable spine dirs are partitioned by surface (`demo` vs `test`).
4. **Separate browser memory** — `localStorage` keys are namespaced `fruma:demo:*` / `fruma:test:*`.
5. **APIs require login** — `/api/test/*` and `/api/demo/*` return 401 without a founder session.
6. **Preview branches** — Vercel preview URLs for feature PRs are sandboxes. Production (`fruma.vercel.app`) only changes when merges land on `main`.
7. **Further promotion is still manual** — when the next Test behaviour is accepted, say **Promote** again.

## What was promoted (and what was not)

**Promoted into Demo**
- Pilot workbook deposit + header map confirm
- Cited fabric shortlist (mills file cloth, not garment SKUs)
- Anonymous mill confirmation with timestamped commercials
- Locked versioned product-truth record
- Durable spine (file / optional Postgres)
- Removal of `FactoryCatalogueEnhancer` fake 12,480-quality catalogue

**Not promoted**
- Fifty-factory Test corpus / dialect Lab UI
- Intent agent choreography (still timers)
- Channel-ready destination scores (still synthetic)

## Rule of promotion

1. Build and verify on `/app/test`
2. Only then port accepted behaviour into `/app` (demo)
3. Do not seed demo with the full fifty-factory corpus unless intentionally promoting a marketplace story
