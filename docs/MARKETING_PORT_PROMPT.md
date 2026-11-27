# Cursor task: port the approved Fruma website, do not redesign it

You are in our existing Next.js website repository. An extracted `fruma-design-handoff` archive has been supplied alongside this repository. Read its README.md, DEPENDENCIES.json and MANIFEST.json first.

This is a faithful source migration into an independent Next.js marketing site—not a redesign, a new interpretation, or a public deployment of Retool.

## Before editing

Inspect git status, Next.js version, App Router versus Pages Router, styling, dependencies, theme handling, current contact/demo integration and Vercel setup. Work on a dedicated branch. Preserve unrelated and uncommitted work. Do not replace the project's package.json, delete routes or change infrastructure blindly.

If the reference directory or image assets are missing, stop and list what is missing. Do not improvise a replacement design or request an anonymous Retool link; none exists for this app.

## Source of truth

1. Latest `reference/frontend/` implementation and original image assets.
2. Matching screenshots of the approved prototype, if supplied.
3. These instructions.

`nextjs-port/` is a mechanically adapted convenience copy. Compare it to the original when integrating. It has not been independently built in our real Next.js repository.

## Preserve the approved UI

Preserve section order, copy, typography, exact theme values, widths, spacing, image crops, border radii, shadows, cards, navigation, mobile layouts, dialogs, tabs, forms and disclosures.

The approved wordmark is title-case **Fruma**, Roboto Medium 500, upright, -0.03em tracking. Do not use the earlier italic, all-caps or rounded lowercase experiments. Use the supplied dotted F rather than drawing another logo. Do not substitute stock images.

Keep the sparkling F and individual dot highlights, source-network stages and illuminated paths, pause/replay/node inspection, hoodie with right-chest F, product dialog, passport preview, product tour, FAQs and demo dialog. Preserve reduced motion, viewport/hidden-tab pausing and cleanup. Do not replace animations with static screenshots or simplify interactions.

## Technical migration

Use the existing Next.js architecture. Adapt routing, asset handling, client boundaries and CSS loading without changing the design. Reuse compatible dependencies and components; the exact primitives are supplied if existing shadcn styling differs. Merge or map the provided Tailwind settings, including density, semantic colours, shadows and animation utilities. Account for Tailwind 4 if applicable.

Keep original images same-origin where canvas samples them. Use the existing theme provider, preserving both modes. Do not include the handover/reference folder in the production build. Do not copy Retool authentication, generated hooks, resources, backend functions, secrets or any internal export UI.

## Form delivery and product honesty

The demo dialog currently downloads a text brief; it does not send enquiries. Inspect the existing approved email/CRM integration. If none is available, ask for the destination and report it as a launch blocker. Do not claim delivery or silently redesign the form. Keep credentials server-side; add appropriate validation, failure handling, duplicate/spam protection and privacy information before real submissions. Do not send live test enquiries without approval.

Preserve synthetic-data, illustrative-network and passport-concept disclosures. No real traceability, factory certification, issued passports or regulatory conformity is asserted. The hoodie is concept artwork, not an item for sale; do not invent product facts, stock or pricing.

## Verify instead of approximating

Run the repository's applicable quality checks and production build. Compare desktop/mobile and both themes at matching viewport sizes, zoom, loaded fonts, dialog/tab states and animation stages. Use screenshot overlays/diffing when available. Correct visible differences and report unresolved ones. A successful build alone is not visual acceptance.

## Vercel delivery

Use the repository's existing deployment process. Commit and push the review branch only when checks pass. Provide the actual Vercel preview URL if a deployment is created. Wait for my visual approval before production. Do not alter DNS, force-push or delete resources without explicit approval.

If required credentials, Git access, screenshots or deployment access are unavailable, say exactly what is missing. Do not claim that www.fruma.ai is updated based only on a local build.

Return the preview URL, changes made, checks run, remaining blockers, form-delivery status and the actual deployed commit/release when available. Implement and verify; do not stop at a plan.
