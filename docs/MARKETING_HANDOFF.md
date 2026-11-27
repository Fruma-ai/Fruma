# Fruma marketing design handover

This archive contains the actual marketing UI source, original brand images, styles, animation code and local UI primitives from the Fruma prototype. It is a source handover for an **independent Next.js marketing website**, not a public deployment of the Retool app.

## What is included

- `reference/frontend/`: the original marketing components and their dependencies, unchanged.
- `nextjs-port/src/fruma/`: the same UI with a client entry point, public asset paths and component-level global CSS imports removed for integration into Next.js.
- `nextjs-port/public/fruma/assets/`: the original image bytes.
- `nextjs-port/examples/`: routing and stylesheet integration examples. These are not replacements for your existing application files.
- `nextjs-port/tailwind.config.reference.ts`: the existing styling configuration with portable content paths. Merge it with your current setup rather than replacing it blindly.
- `DEPENDENCIES.json`: the UI packages and versions used by the reference. Preserve your existing Next.js/React versions where compatible.
- `MANIFEST.json`: file paths, byte counts and SHA-256 digests for the packaged source and assets.
- `CURSOR_PROMPT.md`: the task to give Cursor.

No Retool authentication, generated data hooks, resource declarations, backend functions, API keys or deployment credentials are included. The internal ZIP-export tool is not part of the website handover.

## How to use this with Cursor and Vercel

1. Download and unzip the archive **outside** your existing Next.js repository, such as a sibling `fruma-design-handoff` directory.
2. Open your real Next.js website repository in Cursor. The connected repository can be found in your Vercel project's **Settings → Git**. If no Git repository is connected, first locate the original website project; Vercel hosting alone is not an editable source repository.
3. Make the extracted handover directory available to Cursor and paste `CURSOR_PROMPT.md` into its chat.
4. Ask Cursor to integrate the supplied UI into a new branch of the existing website repository. Do not paste this entire archive over the Next.js project or replace its package.json.
5. Run that project's checks and production build, then commit and push the branch. A Vercel preview is created only if the repository/project has Git preview deployments configured.
6. Compare the preview against the approved Retool prototype, including desktop/mobile, light/dark, dialogs and animation stages.
7. After approval and after fixing the launch blockers below, deploy through the existing Vercel production workflow. Do not alter DNS or overwrite unrelated work without approval.

**The archive is not an automatically deployed or independently build-verified Next.js project.** The mechanical port must be integrated and built in the real Next.js repository. No deployment credentials are available in this workspace.

## Preserve the approved design

Use the actual source and image assets rather than recreating the design from a written description. Preserve section order, copy, spacing, sizes, cards, borders, responsive behaviour, image crops, dialogs and interactions.

The current wordmark is **Fruma**, title case, Roboto Medium 500, upright, with `-0.03em` letter spacing. The font package is `@fontsource/roboto@4.5.8`, imported with `@fontsource/roboto/500.css`. The earlier italic, all-capital and Kosugi Maru wordmarks are not the current design.

The complete colour values are in `appTheme.css`; the supporting semantic, density, radius and shadow variables are in `theme.css`. Both matter. Classes such as `px-density-lg` and `shadow-retool-sm` are ordinary styling tokens here, not a dependency on the Retool runtime. Preserve or carefully map them.

The body font stack starts with Inter and falls back to system sans-serif. Check the actual font that loads in the Next.js environment during visual comparison; do not assume a font injected by the preview platform will be available there. Follow the destination project's font licensing policy.

All runtime images are supplied Fruma brand/concept artwork. The hoodie visual uses a crop and composited chest logo from those assets; preserve the CSS geometry if retaining that approach. The sparkling F samples the original image, so keep that image same-origin for canvas access.

## Next.js integration notes

- Start from the existing repo. Determine App Router versus Pages Router before editing.
- `nextjs-port/src/fruma/pages/Home.tsx` includes `use client`. Its descendants use state, effects, Radix, Recharts and browser animation APIs.
- `nextjs-port` rewrites local JPEG imports to `/fruma/assets/...` strings so plain image elements do not receive Next.js StaticImageData objects.
- Component-level CSS imports have been removed only in the adapted copy. Load the listed global styles from your existing root layout or `_app` in the same order, after the project's Tailwind stylesheet.
- Use the destination project's existing theme provider. The UI expects the `dark` class on the root element. Support system preference and retain any existing user preference behaviour.
- The reference uses Tailwind 3.4. If the destination uses Tailwind 4, deliberately map the semantic colour, density, radius and shadow utilities; do not assume the old configuration applies automatically.
- Keep existing shadcn components only if they are visually compatible. The exact primitives used by this design are included under `lib/shadcn/` if necessary.
- Keep animation pause/replay, offscreen and hidden-tab pausing, reduced motion, canvas cleanup and responsive behaviour.
- The original document-title effect can be replaced with matching Next.js metadata. Do not change the approved page title or copy as part of the port.
- The examples omit authentication and deployment settings deliberately. This is not a way to remove Retool's login wall; it is UI source for a separate website.

## Stylesheet order

After the destination's Tailwind/global reset, load:

1. `src/fruma/theme.css`
2. `src/fruma/appTheme.css`
3. `src/fruma/pages/marketing.css`
4. `src/fruma/components/network/network.css`
5. `src/fruma/components/network/hoodie.css`
6. `src/fruma/components/branding/sparklingBrandMark.css`

Review how these global tokens interact with unrelated pages. If the destination shares a codebase with other applications, scope or integrate the theme carefully without changing this landing page's appearance.

## Launch blockers and product honesty

- The demo dialog currently prepares a downloadable text brief. **It does not send an enquiry, book a meeting or store leads.** Reuse an existing approved form integration or obtain a destination before wiring delivery. Keep provider credentials server-side and add validation, error handling, spam protection, rate limiting and appropriate privacy information. Do not silently claim successful delivery.
- Marketplace, factory, material and evidence examples are synthetic. The network is illustrative, not live traceability.
- Passport panels are concepts, not issued passports or a regulatory compliance guarantee.
- The hoodie is brand-concept artwork, not a purchasable item. Do not invent price, stock, composition, origin or certifications.
- Real screenshots of the approved prototype are **not included** in this code-only ZIP. Capture desktop/mobile screenshots separately for pixel comparison. Source files are authoritative, but identical rendering must be checked in the destination browser and project.
- Verify metadata, favicon, approved social imagery, canonical domain, accessibility, all interactive states, form delivery and real Vercel deployment status before declaring the website live.
