@AGENTS.md

# MegaStar Arena CRM — standing rules

Internal CRM for MegaStar Arena KL, **live in production** — real staff use it daily. Pushes to `main` auto-deploy to Vercel (repo: github.com/jackywong29/megastararena-crm).

## Working with Jacky
- **Draft first:** for any nontrivial batch of changes, lay out the plan in chat and wait for confirmation before coding. Bug reports are the exception — fix immediately, no draft.
- Jacky is non-technical but capable — give step-by-step browser instructions, keep things simple first, add features later.
- **Always paste SQL inline in chat**, not just a file path — he copies it into the Supabase SQL Editor himself and can't always open files directly.

## Migrations
- Sequential manual SQL files in `supabase/` (`schema.sql`, `schema-v2.sql`, …). There is no migration runner and Claude has no DB access (no service-role key in `.env.local`) — Jacky runs every migration himself in the Supabase SQL Editor.
- Adding a migration = new `schema-vN.sql` file **plus** the same SQL pasted inline in chat.

## ⚠️ CHECK-constraint gotcha (two real production failures so far)
Postgres CHECK constraints on `profiles.department`, `profiles.role`, and `notifications.type` do **not** update when a TypeScript union gains a new value — inserts/updates then fail with `violates check constraint`. **Any time an enum value is added, check whether that column has a CHECK constraint** and ship a migration using the introspection drop-and-recreate pattern in `supabase/schema-v6.sql` / `schema-v7.sql`.

## Code rules
- Run `npx tsc --noEmit` and make sure it passes before telling Jacky a change is ready to push.
- Next.js 16 uses `proxy.ts`, not `middleware.ts`. Per AGENTS.md, check `node_modules/next/dist/docs/` before assuming an API works like older Next.js.
- Any new fixed-bottom mobile element must handle safe-area insets (`env(safe-area-inset-bottom)`) — follow the pattern in `components/MobileNav.tsx` and `app/dashboard/layout.tsx`. Content trapped behind the iOS Safari bottom bar has bitten twice.

## Current status
Feature list, data model, migration history, and open items live in the status doc below. Keep it current — update it at the end of a work session instead of duplicating status into memory.

@PROJECT_STATUS.md
