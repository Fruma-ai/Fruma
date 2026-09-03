# Fruma product truth architecture

## Product principle

**Capture truth once, as close to source as possible. Carry it forward without changing what it means.**

Fruma starts at product birth. The canonical product record begins with product intent and accumulates structured, attributable facts as sourcing and creation progress. Listing is a destination of product truth, not the point at which product truth is created.

This extends the existing bookend strategy without turning Fruma into PLM, MES, proto, fit, sewing or production software. Physical development stays physical; Fruma preserves information continuity through it.

## Canonical product record

A product record should be versioned from the beginning of a product's life and should accumulate:

- intent and requirement contract
- material and construction facts
- mill/source identity where permitted
- commercial confirmations
- evidence and claims
- country/process/scope information
- physical-development facts once approved and supplied
- sourcing selection and relationship history
- retailer / own-site destination mappings
- regulatory, traceability and product-passport mappings

The same underlying fact can serve sourcing, commerce and compliance destinations. Destinations must not silently change source truth.

## Provenance-native fact

Every important fact should be capable of carrying:

- `value`
- `source_type` — mill file, brief, sketch, mill response, evidence document, approved product record, retailer mapping, etc.
- `source_record_id`
- `source_field` / original label where applicable
- `scope` — quality, product, mill site, organisation, process, shipment, etc.
- `evidence_id` where evidence exists
- `status` — evidenced, confirmed, inferred, missing, physical-only, stale
- `confirmed_by`
- `confirmed_at`
- `valid_from` / `valid_until` where applicable
- `applicability`
- `version`

Raw mill/source rows remain immutable. Normalised values live alongside source values rather than replacing them.

## Claims and evidence

Compliance and sustainability cannot be a generic checkbox. Model them as:

`Claim -> Scope -> Evidence -> Issuer -> Validity -> Applicable product / quality / site`

A mill-level or site-level certificate must not automatically become a product-level claim. Expired evidence remains visible as expired. Missing evidence remains missing. Agents can map and identify gaps but never invent certifications, origin, composition, sustainability or legislative facts.

## Three destinations of the same truth

### Source
Use product intent + mill working data + current confirmations to source and select what can actually be made.

### Market
Map the accumulated product record into the brand's own site, retailers, marketplaces and other commerce schemas. Listing data should be available because the record has been forming since product birth.

### Trust
Map attributable facts and evidence into due-diligence, traceability, sustainability substantiation, legislative requirements and Digital Product Passport requirements as those destination schemas become relevant.

Fruma should not claim legal readiness merely because fields exist. It should show what is evidenced, what is applicable, what is missing and what needs confirmation.

## Brand-private sourcing memory

Relationship intelligence is tenant-private to each brand. The same mill may be preferred for one brand, proven for a particular category for another, unused for another, and excluded by another.

Brand-private relationship memory can include:

- preferred suppliers
- proven product categories
- exact products / qualities previously used
- previous selections
- last confirmations
- private notes
- exclusions
- sourcing outcomes

This private memory can influence search ordering but must never override current evidence or commercial reality and must never leak across brands.

## Product lifecycle implication

`INTENT -> CHECK -> SOURCE -> CONFIRM -> DEVELOPMENT -> LIST -> LIVE`

The canonical product record exists across the whole lifecycle. Development is a boundary state, not a data reset. Approved facts coming out of physical development enrich the existing record.

The UI should increasingly make this visible as a growing **Product truth** / **Source truth** record rather than making Listings appear to create the product record.

## Compounding data asset

Fruma's connected intelligence becomes:

`what brands try to make <-> what mills actually run <-> what can be supplied now <-> what evidence supports it <-> what gets selected <-> what the finished product becomes <-> what each market / regulatory destination requires`

The advantage is not simply more data. It is understanding how the data connects while preserving source, scope, ownership and confidentiality.
