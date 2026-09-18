# Fruma agent instructions

You are building mill fabric intelligence. Demo `/app` is frozen. Build on `/app/test`.

## Surfaces
- Demo: `/app`, CustomerDemoPlatformV3. Do not edit unless the user says Promote.
- Test: `/app/test`, `/api/test/*`. Safe to break.
- Production: merge to main deploys fruma.vercel.app. You never merge.

## Invariants (do not “help” by violating)
1. Immutable mill source. Never invent fibre/origin/certs/MOQ/article IDs.
2. Organic ≠ GOTS. Mill programme ≠ quality claim. Missing stays missing.
3. Named grants only. Cookie cannot grant.
4. Brand memory is private. Exclusions hidden. No cross-brand leak.
5. Mills file fabrics/materials, not product hangers.
6. Agents get bounded pointers, never the whole corpus in an LLM prompt.
7. No MES, live retailer publish, legal pass, or Postgres unless Owen says so.

## Before you code
- Read docs/FOCUS_NOW.md and open GitHub PRs. If #34/#33 overlap, stop.
- Prefer extending lib/fruma/intelligence (main) or lib/fruma/agents (#34) — do not create a third runtime.

## Done
- npm test green
- Demo diff empty (unless Promote)
- Honesty tests still pass
- UI: browser-check Test; Demo freeze banner still present

## Cursor Cloud
- Test login uses a founder cookie from env — never commit passwords.
- `npm test` is the gate before any PR update.
- Computer-use / browser checks target `/app/test`, not `/app`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
