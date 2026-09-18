# Where Fruma is — before enterprise ready

Snapshot for Owen (CTO). Measured on `main` (`11e8425`) plus findings already running on draft [PR #34](https://github.com/Fruma-ai/Fruma/pull/34). Demo `/app` is frozen; this is about the Test corpus and the product spine.

## Verdict

Fruma is an **architecture-approved prototype** with a **real mill-file ingest engine** and a **choreographed customer demo**. It is **not enterprise ready**. Dummy brands and mill fabric books are performing their job: they exposed that “ingests without throwing” is not the same as “searchable mill cloth,” and that mill files are **fabrics and materials**, not product hangers. The mass of that cloth is what tells a brand which end products can actually be made.

The product position gets stronger by **deepening that spine** (map → retrieve → evidence → confirm), not by adding rooms, dashboards, or more dummy factories.

## Two surfaces, two truths

| Surface | Path | What it actually is |
| --- | --- | --- |
| **Demo** | `/app` | Customer story. Named agents are **UI timers**. Seeded mills, synthetic channel scores. Do not treat as live intelligence. |
| **Test** | `/app/test` | 3 brands, 50 mill **fabric books**, 36 intended end products, 150 private links, ~1,400 mill quality rows. Lab ingest is **real**. |
| **Production site** | `fruma.vercel.app` | Same repo. Founder gate. Apply emails `owen@fruma.ai`. |

Public site, honesty copy, and product-truth rules are coherent. Persistence is in-memory. Auth is three founder passwords. There is no tenant database, job queue, mill login, or brand SSO.

## Enterprise-ready vs now

The ten product gates in `docs/PLATFORM_REVIEW.md` are **decided**. Enforcement is **partial**.

| Gate | On `main` | On PR #34 (Test only) |
| --- | --- | --- |
| 1. Product truth from intent | Types only (`product-truth.ts`) | Brief → retrieval facts, not a versioned product record |
| 2. Immutable source | **Yes** — deposits keep original bytes + cells | Same |
| 3. Scope-aware evidence | Types + ingest certs never inferred | Evidence agent **blocks** organic-fibre ≠ GOTS and mill-programme promotion |
| 4. Commercial freshness | Not implemented | **Next steward pull** — fabric-book MOQ/lead still look current |
| 5. Private brand memory | Corpus links exist; unused by search | Retrieval **hides exclusions**; same mill differs per brand; no leak in tests |
| 6. Anonymous mill requests | Architecture only | Not built |
| 7. Bounded agents | `agent-runtime.ts` unused | Harness / Mapping / Retrieval / Continuity / Evidence runs, in-memory |
| 8. Physical stays physical | Held | Held |
| 9. Destinations as projections | Channel lab + Sunspel listings code (studio not routed on `/app`) | Not the focus |
| 10. No legal shortcut | Honesty + market-score copy | Evidence agent: audited claims are **not** brand-safe by default |

**Still missing for a production prototype:** Postgres + object storage + async jobs, named mill→brand grants in the UI, one **real** mill workbook, mill confirmation timestamps, and a versioned product-truth record. That is the first production vertical slice in `PLATFORM_REVIEW.md` — not a marketplace, not MES, not live retailer publish.

## How dummy data is actually performing

Corpus on Test (`lib/fruma/test-corpus`):

- **Brands:** Northline Studio, Harbour Standard, Field & Form
- **Factories:** 50 across PT / IT / TR / PL / UK, six mill-file dialects
- **Links:** 150 tenant-private rows — preferred 17, proven 24, previous 29, new 71, excluded 9
- **Tests on `main`:** all 50 files deposit without throwing, and `qualities > 100`. That bar is too low.

Full-corpus ingest on `main` (deterministic header map in `parse-csv.ts`, no LLM):

| Dialect | Factories | Qualities | Exceptions | Cells mapped | What happened |
| --- | --- | --- | --- | --- | --- |
| `pt-standard` | 9 | 242 | 0 | **100%** | English mill headers. This is the happy path. |
| `messy-mixed` | 8 | 219 | 8 | **100%** | Same headers; one blank article per mill, correctly excepted. |
| `tr-knit` | 8 | 230 | 0 | 56% | Rows exist; knit type, fibre, width, MOQ stay unmapped. |
| `uk-imperial` | 8 | 229 | 0 | 67% | Article maps; oz / inches / yards do not. No unit conversion. |
| `it-shirting` | 9 | 244 | 0 | 33% | Fabric No maps; Weave / Comp. / Wgt gsm / Min order do not. |
| **`pl-fleece`** | **8** | **0** | **228** | 33% | **`Art.` is not an article alias. Eight Polish mills produce zero qualities.** |

Totals: **1,164 qualities** from 1,400 rows, **236 exceptions**, **19 unknown headers**, **~16% of factories dark**. Unmapped columns are **silent** — Lab can say “no mapping exceptions” while most of a row never reached the Fruma standard.

That is the most important dummy-data finding: **ingest success ≠ mill catalogue**. Portuguese-shaped files work. Real mill dialects do not, until mapping is a first-class exception.

## What agents found (draft PR #34 — not on `main` yet)

On `/app/test?tab=agents` that branch runs Harness → Mapping → Retrieval → Continuity → Evidence → All brands.

**Mapping.** A deterministic lexicon proposes `Art.` → article, `Weave` → construction, `GSM` → weight, `Colourway` → colour, and the rest of the 19 silent headers. Proposals wait for confirm. They do not invent fields. After overlays, Polish mills stop being a total loss. Brand value: a mill is searchable because someone confirmed a column, not because Fruma guessed a cloth.

**Retrieval.** For a named-navy brief, each brand gets a **12-mill shortlist**; **3 excluded mills stay hidden**. Colour named in the brief becomes MUST (mismatch rows ineligible). Unnamed colour stays OPEN — the agent does not invent navy.

**Tenant moat.** Same mill `factory-001`: Northline = excluded, Harbour = previous, Field & Form = excluded. Switching brands never diffs another tenant’s shortlist. One catalogue spine, three private intelligence views. That is the compounding asset in `PRODUCT_TRUTH_ARCHITECTURE.md`.

**Evidence.** Organic fibre on a mill quality is **not** GOTS. Mill-level programmes stay mill-level. Audited claims are **not** auto brand-safe. This is the honesty rule working on data, not just copy.

**Continuity.** Rebuy is exception-only against a **brand-scoped** prior snapshot. Cross-brand diffs stay at zero.

**What is still fake even there.** Runs live in process memory (gone on deploy). Commercials on the mill file are not marked historical. No mill has confirmed current MOQ/lead. No real workbook. Demo still choreographs the same story with timers.

## What makes the position stronger

These are product conclusions, not a feature list.

1. **Dialect coverage is the mill wedge.** Mills drop the fabric book they already have. Fruma’s first durable advantage is mapping that mass of materials — that only holds if unknown headers become mapping work, not silent data loss. Test Overview now shows dark mill books and dialect playbooks.
2. **Silence is worse than an exception.** `empty_article` is honest. Unmapped `Weave` / `Art.` is not. Mapping-agent fuel must be **unknown headers**, not only blank articles. Lab no longer reports “no mapping exceptions” when columns are silent.
3. **Relationship memory is already a moat if we never leak it.** Dummy brands prove the same factory can be preferred for one tenant and excluded for another. The Source tab reorders on that memory, without overriding evidence.
4. **Honesty compounds.** Evidence flags + `honesty.ts` + “not an audit” scoring are the same product. Organic fibre is not GOTS. Mill programmes stay mill-scope. Fabric-book MOQ is labelled historical. Do not let Demo animations or `FactoryCatalogueEnhancer` (12,480 fake qualities) outrun that.
5. **Answerability is a better UI than a score.** Source shows which MUST/PREFER/OPEN requirements a mill can actually answer from mapped fields — on-file, unmapped, missing, or needs confirm.
6. **Mills file cloth, not garments.** Source matches mill fabrics that can become an end product. A fleece book never shortlists as a polo catalogue. The volume of materials is the catalogue.
7. **Do not broaden.** Channel publish, MES, proto, legal pass, and marketplace dashboards are correctly deferred. They would spend the next months on surfaces that still sit on unmapped mill rows.
8. **Demo and Test must stay split until Test is accepted.** Promoting choreography as intelligence would weaken the commercial story.

## What to do next

### Owen (decisions)

1. **Merge [PR #34](https://github.com/Fruma-ai/Fruma/pull/34)** when the Agents tab looks right. That is the Test loop (`FOCUS_NOW` items 1–3) already built. Do not re-implement it on another branch.
2. **Do not Promote** Demo until Mapping confirm + Retrieval shortlists + Evidence gaps have been walked on Test.
3. **Do not add Postgres** until confirmed header maps must survive a deploy or a real mill file is the source of truth (`docs/MEMORY_AND_DATABASE.md` on #34).
4. **Pick one real mill workbook + one pilot brand** as soon as the Test loop is merged. Dummy dialects taught us the failure modes; they cannot prove commercial freshness or mill confirmation.
5. **Save the weekday Automation once** if you want the steward to keep pulling (`docs/CURSOR_AUTOMATIONS.md` on #34). Otherwise say **Go** when you want the next item.

### Steward / engineering (after #34 is on `main`)

Ordered. One theme per PR. Test only.

1. **Commercial freshness on Retrieval** — fabric-book MOQ / lead are historical until a mill confirmation timestamp exists. Never invent current price. (First ready item in `steward-queue.ts`.)
2. **Brief as Agents step 0** — MUST / PREFER / OPEN visible before the shortlist.
3. **Unknown-header exceptions on `main` ingest** if #34’s overlays are not yet merged — so Lab cannot report “no exceptions” for `pl-fleece`.
4. **One real XLSX** through object storage → confirmed maps → searchable quality → evidence-first shortlist → mill response → versioned product truth. That is enterprise-prototype done, not “50 more factories.”

### Explicitly not next

MES / factory floor / proto / fit · live retailer publishing · one-click legal pass · embeddings as source truth · stuffing the fifty-factory corpus into an LLM prompt · unfreezing `/app` to look more agentic.
