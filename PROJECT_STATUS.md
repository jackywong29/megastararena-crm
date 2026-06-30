# MegaStar Arena CRM — Project Status

> **Living document.** This is the running memory of the project. Claude reads it automatically at the
> start of every session (it's imported by `CLAUDE.md`). Edit it freely — anything here is treated as
> project context. Ask Claude to "update PROJECT_STATUS.md" at the end of a work session to keep it current.

**Last updated:** 2026-07-01

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
- **Shows & pipeline** — Kanban board (Inquiry/Confirmed/Done), show detail with Overview/**SOP**/Docs/Tasks/Activity tabs. New-show creation limited to admin + Sales/Management dept heads. Setup, Rehearsal & Dismantle each have an optional separate **date** (for multi-day shows) in addition to time, plus an optional **Next Meeting** date/time (`meeting_date`/`meeting_time`, schema-v10). Internal notes hidden from `staff`. Booking form fields use the Sales team's terms (Company Name, PIC, Contact Number, **Company Address** = `client_address`).
- **Home** — greeting, then a prominent **"Next Show" hero card** = the **closest upcoming show**: soonest non-done show dated **today or later** (KL time), so a past show that was never marked Done never sticks in the card — it auto-rolls forward as shows pass. Shows date/time, next meeting, expected attendance, its open Booking-SOP next-steps + open tasks; below it a "More Upcoming" list (also future-only), stats strip, and the team feed. *(A show only appears if it has a `show_date` and isn't Done.)*
- **Sales SOP / Booking checklist** (added 2026-06-30) — each show has a **SOP tab** with 4 sections seeded from the Sales team's workflow: Booking SOP (11 ordered steps), Pre-Event/Meeting Checklist, Document Checklist, After Event. Items support tick / add / remove / mark-**N/A** / note. Steps "Issue Second Invoice" / "Issue Final Invoice" auto-show a due date computed from `show_date` (−2 months / −2 weeks). The master template lives in `lib/sop.ts`; it seeds into `show_checklist_items` the first time a show is opened, then is fully editable **per show**. **Editing is Admin + Sales only** (`canEditSop` in lib/utils.ts); everyone else views read-only. Permissions are UI-enforced (RLS is permissive, matching tasks/documents). NOTE: this re-introduces seeded items — different from the old *operational* auto-tasks that were removed, because it's sales-owned, in its own tab, and every item is editable/removable. *Phase-2 backlog: an in-app editor for the master SOP template (currently code-only); optional file-link from Doc-checklist items to the Docs tab (`document_id` column already exists).*
- **Tasks** — department-scoped permissions (dept head manages own dept only; staff can only tick; admin full). Preset SOP auto-tasks were removed by request — tasks are added manually. Personal "My Tasks" page also shows a **Booking SOP** section (open, non-N/A SOP steps across all shows, sorted by due date, tickable) for **Sales + Admin** only.
- **Leave system** — ⚠️ **currently HIDDEN (2026-06-30)**, may return later. Nav links (sidebar + mobile) removed, calendar leave layer off, `/dashboard/leave` redirects to home. The `leave_applications` table + data and `LeavePageClient.tsx` are kept intact — to restore, undo those edits (see git). Original behaviour: apply → pending → admin/`can_approve_leave` approve/decline, shown on the Calendar.
- **Home feed** — posts with pin (max 3, admin/dept-head), emoji reactions (👍❤️🎉👀), newest/oldest sort, threaded comments. Profile pages show the user's own posts. **@mentions** (2026-06-30) in posts + comments: type `@` for an autocomplete of staff (`MentionTextarea`), tagged people get a `mention` notification, mentions render highlighted (`MentionText`). Tagged user IDs stored in `posts.mentions` / `post_comments.mentions` (schema-v11). Helpers in `lib/mentions.ts`.
- **Team directory** (2026-06-30) — `/dashboard/team`, visible to everyone; searchable, grouped by department, inline cards (avatar, role, dept, email). "Team" nav entry in sidebar + mobile. No DB change (reads `profiles`).
- **Notifications** — in-app bell (Supabase realtime). Fires on: show confirmed, new post, **@mention** (in post/comment), new task in a department. `mention`/`new_post` route to the home feed. (Leave-related notifications are dormant while leave is hidden.) Sidebar shows a dot on the bell.
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
`v8` (setup/rehearsal/dismantle dates) → `v9` (client_address + show_checklist_items / Sales SOP) →
`v10` (meeting_date/meeting_time on shows) → `v11` (`mention` notification type + posts/post_comments `mentions` arrays).

There is no migration runner — Jacky pastes each file's SQL into the Supabase SQL Editor himself. When
adding a migration, also paste the SQL inline in chat (he can't always open the file directly).

---

## Open items / what's next
- [x] **schema-v9/v10/v11 run & deployed (2026-07-01).** Jacky confirmed v9–v11 are applied in Supabase; the full feature batch (Sales SOP, hidden Leave, Next Show hero, SOP-in-My-Tasks, Team directory, @mentions) + the hero "upcoming-only" fix are pushed to `main` and live on Vercel.
- [ ] Staff feedback backlog (remaining): email notifications (Resend) — esp. email-on-@mention → doc-approval workflow → direct messaging/chat. Leave system may also be re-enabled. *(Team directory + in-app @mentions: done 2026-06-30.)*
- [ ] 2027 Islamic/lunar holiday dates are **estimates** pending official gazette — re-check closer to each date.
- [ ] Historical past shows were never imported (staff re-enter manually for accuracy — by decision).
- [ ] No push notifications / PWA — in-app bell only by design. Revisit only if staff stop checking the app.

---

## Working preferences (Jacky)
- **Draft first:** for any nontrivial batch of changes, lay out the plan in chat and wait for confirmation before coding. Bug reports get fixed immediately (no draft).
- Non-technical but capable — give copy-paste SQL inline, step-by-step browser instructions.
- Computer use off by default. Keep things simple first, add features later.
