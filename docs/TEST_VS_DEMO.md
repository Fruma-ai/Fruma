# Test vs demo versions

Fruma keeps two surfaces so engineering work does not quietly rewrite the customer demo.

| Version | Path | Purpose |
| --- | --- | --- |
| **Demo** | `/app` | Customer-facing story. Update only when the test corpus behaviour is accepted. |
| **Test** | `/app/test` | Three dummy brands + fifty factories with private hanger CSVs. Safe to break. |

## Environment protection (do not skip)

1. **Build only on Test** — agents, ingest, mapping, retrieval experiments live under `/app/test` and `/api/test/*`.
2. **Demo is frozen by policy** — do not change `CustomerDemoPlatformV3` or demo data until you explicitly ask to promote.
3. **Separate server memory** — mill ingest engines are partitioned by `X-Fruma-Version` / surface (`demo` vs `test`). Test deposits never share the Demo engine.
4. **Separate browser memory** — `localStorage` keys are namespaced `fruma:demo:*` / `fruma:test:*`.
5. **Test APIs require login** — `/api/test/*` returns 401 without a founder session (same gate as `/app`).
6. **Preview branches** — Vercel preview URLs for feature PRs are sandboxes. Production (`fruma.vercel.app`) only changes when merges land on `main`.
7. **Promotion is manual** — when Test feels right, tell the agent to promote accepted behaviour into Demo. Until then Demo stays the customer story.

See also `docs/FOCUS_NOW.md` for the ordered engineering focus after the dummy corpus, and `docs/WHERE_WE_ARE.md` for measured ingest results and enterprise-readiness status.

## Test corpus contents

- **Brands:** Northline Studio, Harbour Standard, Field & Form
- **Factories:** 50 mills across PT / IT / TR / PL / UK with distinct dialects
- **Products:** 12 per brand (36 total)
- **Links:** 150 brand↔factory relationship rows (tenant-private)
- **Hangers:** deterministic CSV per factory (`lib/fruma/test-corpus/hanger.ts`)

Download a hanger from the Factories / Hangers / Lab tabs, or (signed-in):

```
GET /api/test/factories/factory-001/hanger
```

Run a Test-only ingest from the Lab tab, or:

```
POST /api/test/ingest
Content-Type: application/json
{ "factoryId": "factory-001" }
```

## Rule of promotion

1. Build and verify on `/app/test`
2. Only then port accepted behaviour into `/app` (demo)
3. Do not seed demo with the full fifty-factory corpus unless intentionally promoting a marketplace story
