# Agent status (Test surface)

Live workers on `/app/test?tab=agents`. Demo `/app` is untouched.

## Live now

| Agent | Job | Status |
| --- | --- | --- |
| **Corpus Harness** | Deposit all 50 Test factory hangers; score by dialect; list unmapped headers + empty-article rows | Live |
| **Mapping** | Propose Fruma fields for unmapped headers; auto-confirm high-confidence lexicon matches; queue the rest for human Confirm | Live |
| **CI** | `npm test` on every PR (includes agent tests) | Live |

## Key findings (first harness pass, before mapping)

Measured on the Test corpus:

- **Before Mapping:** 42/50 factories ok · 1164 qualities · 19 headers unmapped
- **pl-fleece** total failure — `Art.` not recognised as article → 0 qualities / 228 empty-article exceptions
- Other dialects still produced qualities via known article headers, but left Weave / Comp. / GSM / etc. unmapped
- **After Mapping auto-confirm:** 50/50 factories ok · 1392 qualities · 0 headers left

Built-in header map only knows “clean” English headers. Mapping lexicon recovers mill dialect aliases without inventing values.

## Next agents (recommended)

1. **Brief / Retrieval** — Northline product brief → structured filters → shortlist of Test factories with evidence links.
2. **Continuity** — diff this harness vs last run; only emit new exceptions.
3. **Evidence** — flag cert/origin claims that lack scope or issuer (never invent GOTS).
4. **Build steward (Cursor)** — standing Cloud Agent: advance `docs/FOCUS_NOW.md` on Test only; open draft PRs; never touch Demo.
5. **Dialect tutor** — when a new mill header appears three times, open a Mapping proposal automatically.

## How Owen uses this

1. Open `/app/test?tab=agents`
2. Run **Corpus Harness** — read findings
3. Run **Mapping agent** — confirm anything left in needs-review
4. Re-run Harness — expect 50/50
5. Tell the coding agent when to start **Retrieval** or when to **connect Postgres** (see `docs/MEMORY_AND_DATABASE.md`)
