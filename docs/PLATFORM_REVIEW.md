# Enhanced platform review

Status: architecture / transaction prototype review before merge.

## Review verdict

The sourcing-case architecture is the right replacement for the earlier room-based prototype. The product now has one coherent lifecycle and an explicit boundary around physical development. The next build should deepen the transaction and data spine, not broaden into PLM/MES features.

## Product gates before production prototype

### 1. Product truth exists from Intent
The canonical record starts when a product starts, not when Listings starts. Intent, source evidence, mill confirmation and approved downstream facts accumulate on the same versioned record.

### 2. Source truth is immutable
Original mill rows/files remain immutable. Normalised/mapped facts sit alongside the source with source field/value, mapping state, scope and timestamp.

### 3. Evidence is scope-aware
A claim is only usable where its evidence applies. Site, organisation, quality, material, product and process scopes cannot be silently promoted into one another. Expired evidence remains expired. Missing remains missing.

### 4. Commercial truth is freshness-aware
Historical price, MOQ, lead and sampling data may help retrieval but must not be presented as current until reconfirmed. A current mill response is timestamped and attached to the sourcing case.

### 5. Brand relationship memory is private
Preferred, proven, previously-used and excluded supplier states are brand-tenant data. They can influence ordering but never override evidence, current availability, MOQ or delivery reality. They never leak to mills or other brands.

### 6. Mill requests are anonymous
The mill receives only information required to answer the sourcing request. Brand identity and cross-brand demand signals stay hidden.

### 7. Agents are bounded workers, not the database
Agents never scan the entire corpus in prompt context. The system retrieves eligible records first, then agents operate on bounded candidate/evidence sets. Agent output must reference source IDs and be resumable/auditable.

### 8. Physical development stays physical
Proto, fit, grading, sewing, QC, line planning and production WIP remain outside Fruma. Fruma preserves the information record through that period and resumes when approved facts are available.

### 9. Destinations are projections
Own-site, retailer, marketplace, traceability and future DPP schemas are projections of canonical product truth. Destination mappings cannot mutate source truth.

### 10. No legal-readiness shortcut
Fruma may identify evidence gaps and map attributable facts to requirements. It does not infer legal compliance from field completeness or present a one-click legal pass.

## Scale architecture

Design the production data spine for millions of source records and concurrent asynchronous work from the beginning:

- Postgres for tenant-scoped canonical relational truth and transaction state.
- Object storage for immutable uploaded files and evidence documents.
- Asynchronous ingest / mapping / indexing / evidence jobs; never hold a request open for whole-file processing.
- Idempotency keys on ingestion and agent jobs so retries do not duplicate truth.
- SourceRecord partition/index strategy by organisation, mill book, ingest batch and active state.
- Search/retrieval layer for candidate generation before deep matching. Embeddings are retrieval aids, never source truth.
- Structured filters (construction, fibre, MOQ, geography/evidence applicability etc.) before semantic ranking where possible.
- Bounded agent batches with explicit input/output schemas, source IDs, run IDs, version IDs and failure states.
- Append-only audit/event trail for material truth changes, confirmations and mapping corrections.
- Incremental re-indexing: a changed mill row or mapping should not rebuild an entire corpus.
- Queue backpressure, concurrency limits, dead-letter handling and resumable checkpoints for large ingest jobs.
- Tenant isolation enforced at data access, retrieval and agent-job boundaries.
- Observability for ingest throughput, mapping exceptions, retrieval latency, agent cost, failure/retry rate and stale evidence/commercial data.

## Agent pipeline at scale

`file -> ingest job -> immutable source rows -> deterministic normalisation -> mapping exceptions -> searchable index -> structured eligibility retrieval -> semantic retrieval/rerank -> bounded evidence/match evaluation -> sourcing request -> mill confirmation -> canonical product truth`

Agents should specialise:

- Ingest: classify sheets/columns/record families and flag ambiguity.
- Mapping: propose mappings for unknown mill vocabulary; reuse confirmed mappings; preserve unmapped columns.
- Brief: turn product intent into requirements with MUST/PREFER/OPEN and answerability.
- Continuity: diff against prior product/version/relationship truth and emit exceptions only.
- Retrieval/match: work on an already-filtered candidate set and return evidence links per requirement.
- Evidence: evaluate claim scope, currentness and applicability; never fabricate missing evidence.
- Commercial: distinguish historical terms from current mill-confirmed terms.
- Destination: map confirmed facts to schemas without changing canonical values.

## First production vertical slice

One brand + one mill + a genuine mill workbook is enough to prove the architecture:

`real XLSX/CSV -> object storage -> ingest batch -> preserved source rows -> confirmed column mappings -> searchable quality -> brand product -> requirement contract -> evidence-first shortlist -> anonymous request -> mill response -> source selection -> versioned product truth record`

This is the next engineering milestone after the enhanced platform prototype is accepted.

## Explicitly deferred

- Factory-floor MES / WIP
- Proto / fit workflow ownership
- Automated legal determination
- Live retailer publishing
- Production DPP issuance
- Broad marketplace demand dashboards
- Full network-learning optimisation

These should not block the first production prototype.
