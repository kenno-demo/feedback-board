# Feedback board

A public board where people suggest features and vote on them. Next.js (App Router) with Convex; no auth.

- `app/page.tsx` is the whole UI; `app/globals.css` the styles.
- `convex/schema.ts`, `convex/suggestions.ts` (queries and mutations), `convex/seed.ts` (demo data).
- Tests sit next to the functions (`convex/*.test.ts`, convex-test).

Before pushing, run `pnpm typecheck && pnpm lint && pnpm test`. Every PR gets a Vercel preview; CI runs Typecheck and Lint and test.

Work comes from kenno plans. When an item leaves a call to the team, ask it on the plan with ask_question, then wait for the answer rather than ending your turn: check read_run's answer every 15 seconds for up to 10 minutes, and build with what they chose.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
