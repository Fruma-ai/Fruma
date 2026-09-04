<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Fruma product preservation rules

The operating product is the primary artifact. Demo work must enhance it, never replace it with a thinner presentation shell.

For any change touching `/app`, brand workflows, mill/factory workflows, demo navigation, or shared Fruma components:

- Preserve all existing working brand and mill navigation and operating screens unless an explicit product decision requires removal.
- Treat changes as additive by default. New demo storytelling, onboarding, AI features, seeded examples, and polish should layer onto the operating product.
- Before merging, compare against the latest known complete operating version and check for accidental loss of routes, navigation items, lifecycle stages, data views, actions, and seeded workflows.
- Brand minimum surface: Range, Products, Suppliers; product intent/brief, concept/inspiration, requirements/product truth, sourcing, current mill confirmation, physical development/sample boundary, standardisation/provenance, channel readiness/listing, and live/handoff context.
- Mill/factory minimum surface: first-time factory profile setup, working-file upload, source-to-Fruma Standard mapping, review/lock, then Home, Requests, Book, Data, Evidence, Samples, Orders, and Messages.
- Mapping must preserve original source fields/values and provenance. A successful mapping must never silently convert an unsupported claim into confirmed product truth.
- AI-generated product visuals are development references and must remain labelled as generated/unverified until physical validation.
- Channel-readiness features prepare and export brand-owned handoff content; Fruma does not imply retailer publishing/submission unless that integration actually exists.
- PR descriptions that alter the operating product should state what existing brand and mill surfaces were regression-checked.
