# Fruma channel readiness architecture

## Product boundary

Fruma prepares product data and content for a brand. Fruma does **not** submit or publish product content to retailers, wholesalers, marketplaces or the brand's commerce systems.

The terminal state is **Ready for brand**.

## Standardisation loop

1. Factory / mill source data
2. Fruma Standard
3. Brand Standard
4. Fruma-governed translation
5. Retailer / wholesaler destination standard
6. Readiness, content optimisation and validation
7. Ready for brand

The Fruma Standard is the stable semantic layer across the lifecycle. The source system's original value, field name, evidence and provenance remain attached to canonical facts.

### Inbound

Factory and mill data can arrive with different schemas, terminology, abbreviations and units. Fruma maps those values into a canonical model. Mapping changes structure, not meaning. A mapped value is not automatically a confirmed product fact.

### Brand

The brand standard describes the brand's own taxonomy, attribute model, naming conventions, approved commercial values and merchandising language. AI may suggest mappings from the Fruma Standard to the Brand Standard. Suggested mappings require visible confidence/status and must not invent missing facts.

### Outbound preparation

A completed brand product record is translated into each destination's requirements. The destination schema may split, combine, classify or reformat approved information. Fruma scores readiness and identifies whether a gap originates in source truth, brand mapping or a destination-only requirement.

## Content optimisation

Destination-specific titles, descriptions, bullets, taxonomy and attributes may be generated or adapted only from source-linked canonical facts and brand-approved enrichment. Unsupported claims are blocked or flagged.

## Readiness

Readiness is destination-specific. It should account for required fields, mapping confidence, missing values, taxonomy conflicts, evidence scope, formatting and content requirements. A high readiness score does not mean Fruma has published anything.

## Handoff

When a package is ready, the brand picks it up for its existing PIM, retailer portal, spreadsheet, API or other submission workflow. Submission ownership remains with the brand.
