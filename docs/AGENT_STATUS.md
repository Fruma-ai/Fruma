# Agent status (Test surface)

Live workers on `/app/test?tab=agents`. Demo `/app` is untouched.

## Live now

| Agent | Job | Status |
| --- | --- | --- |
| **Corpus Harness** | Deposit all 50 Test factory hangers; score by dialect; list unmapped headers + empty-article rows | Live |
| **Mapping** | Propose Fruma fields for unmapped headers; auto-confirm high-confidence lexicon matches; queue the rest for human Confirm | Live |
| **CI** | `npm test` on every PR (includes agent tests) | Live |

## Key findings (first harness pass, before mapping)

- Built-in header map only knows “clean” English headers (`Article`, `Weight`, …).
- Dialects **pl-fleece** (`Art.`), **it-shirting** (`Weave`, `Comp.`, `Wgt gsm`, …), **tr-knit**, **uk-imperial** leave headers unmapped.
- Unmapped **article** headers → **0 qualities** for that factory (fail-closed — correct behaviour).
- Mapping lexicon recovers those dialects when high-confidence proposals are confirmed; re-run Harness → 50/50 ok.

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
