# MegaStar Arena CRM — Project Status

> **Living document.** This is the running memory of the project. Claude reads it automatically at the
> start of every session (it's imported by `CLAUDE.md`). Edit it freely — anything here is treated as
> project context. Ask Claude to "update PROJECT_STATUS.md" at the end of a work session to keep it current.

**Last updated:** 2026-06-27

---

## What this is
A custom internal CRM for **MegaStar Arena KL** (concert venue / multipurpose hall), replacing the old
WhatsApp-groups + Google-Calendar workflow where documents and decisions kept getting lost. It is in **real
use** — staff are actively being onboarded.

- **Repo:** github.com/jackywong29/megastararena-crm · deployed on **Vercel**
- **Location on disk:** `/Users/jacky/Desktop/MSA x Claude/megastar-crm`
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (auth/DB/storage/realtime) · Radix UI
- **Supabase project:** `ohtkqgvzagipbmpyozae` (Singapore region)
- **Auth:** Google SSO only, **invite-only** via the `allowed_emails` table + `is_active` flag

---

## Core model
| | |
|---|---|
| **Roles** | `admin` · `department_head` · `staff` (staff = view-only/restricted) |
| **Departments (6)** | Management, Finance, Operations, Tech, Sales, Event |
| **Show stages (3)** | Inquiry → Confirmed → Done *(Day-of was removed)* |
| **Event types** | Concert, Corporate, Private Function, Other |
| **Leave types** | Annual 14d · Medical 14d · Emergency 3d (per year) |

---

## Features built
- **Shows & pipeline** — Kanban board (Inquiry/Confirmed/Done), show detail with Overview/Docs/Tasks/Activity tabs. New-show creation limited to admin + Sales/Management dept heads. Setup, Rehearsal & Dismantle each have an optional separate **date** (for multi-day shows) in addition to time. Internal notes hidden from `staff`.
- **Tasks** — department-scoped permissions (dept head manages own dept only; staff can only tick; admin full). Preset SOP auto-tasks were removed by request — tasks are added manually. Personal "My Tasks" page.
- **Leave system** — apply → pending → admin/`can_approve_leave` approve/decline. Shown on the Calendar (staff see own, managers see all) to catch clashes before confirming a show date.
- **Home feed** — posts with pin (max 3, admin/dept-head), emoji reactions (👍❤️🎉👀), newest/oldest sort, threaded comments. Profile pages show the user's own posts.
- **Notifications** — in-app bell (Supabase realtime). Fires on: show confirmed, leave approved/declined, new leave request, new post, new task in a department. Clickable → routes to the relevant page. Sidebar shows a dot on the bell.
- **Staff & access** — admin-only page to invite by email, set role/dept, deactivate/remove. Self-healing "No Access" + Restore Access for the profile-exists-but-dropped-from-allowlist case.
- **Calendar** — Monday-first, scrollable month-tab strip, Malaysia/KL public holidays seeded 2026–2027.
- **Mobile** — bottom nav + "More" sheet; safe-area-inset handling so content/buttons aren't trapped behind the nav bar or iOS Safari URL bar.
- **Other** — tutorial modal, header live search, clickable dashboard stats, Mission/Vision/Values page. Legal entity name: **"MegaStar Arena KL Sdn Bhd"**.

---

## ⚠️ Recurring gotcha — DB CHECK constraints don't follow TS enums
Postgres CHECK constraints on `profiles.department`, `profiles.role`, and `notifications.type` do **not**
auto-update when a TypeScript union gains a new value. This caused two real failures (adding the `event`
department; adding `leave_update`/`new_post` notification types). Fix pattern (see `schema-v6.sql` /
`schema-v7.sql`): a migration that introspects `pg_constraint` to find & drop the constraint by inspection,
then recreates it with the new values. **Check for this any time you add an enum value.**

---

## Database migrations (run manually in Supabase SQL Editor, in order)
`schema.sql` → `v2` → `v3` (leave) → `v4` (post pins/reactions/comments) → `v5` (allowed_emails, is_active,
staff role) → `v6` (event-dept constraint fix) → `v7` (notification-type fix + public holidays) →
`v8` (setup/rehearsal/dismantle dates).

There is no migration runner — Jacky pastes each file's SQL into the Supabase SQL Editor himself. When
adding a migration, also paste the SQL inline in chat (he can't always open the file directly).

---

## Open items / what's next
- [ ] **Confirm `schema-v8.sql` has been run** in Supabase (adds setup_date/rehearsal_date/teardown_date).
- [ ] 2027 Islamic/lunar holiday dates are **estimates** pending official gazette — re-check closer to each date.
- [ ] Historical past shows were never imported (staff re-enter manually for accuracy — by decision).
- [ ] No push notifications / PWA — in-app bell only by design. Revisit only if staff stop checking the app.

---

## Working preferences (Jacky)
- **Draft first:** for any nontrivial batch of changes, lay out the plan in chat and wait for confirmation before coding. Bug reports get fixed immediately (no draft).
- Non-technical but capable — give copy-paste SQL inline, step-by-step browser instructions.
- Computer use off by default. Keep things simple first, add features later.
