# MegaStar Arena CRM — Project Status

> **Living document — status only.** Claude reads it automatically at the start of every session (it's
> imported by `CLAUDE.md`). Standing rules (workflow, migrations process, gotchas, code rules) live in
> `CLAUDE.md`; this file tracks *what exists and what's next*. Ask Claude to "update PROJECT_STATUS.md"
> at the end of a work session to keep it current.

**Last updated:** 2026-07-10

---

## What this is
A custom internal CRM for **MegaStar Arena KL** (concert venue / multipurpose hall), replacing the old
WhatsApp-groups + Google-Calendar workflow where documents and decisions kept getting lost. It is in **real
use** — staff are actively being onboarded.

- **Repo:** github.com/jackywong29/megastararena-crm · deployed on **Vercel**
- **Location on disk:** `/Users/jacky/Desktop/Claude/megastar-crm`
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
- **Shows & pipeline** — Kanban board (Inquiry/Confirmed/Done), show detail with Overview/**SOP**/**Meeting Info**/Docs/Tasks/Activity tabs. New-show creation limited to admin + Sales/Management dept heads. Setup, Rehearsal & Dismantle each have an optional separate **date** (for multi-day shows) in addition to time, plus an optional **Next Meeting** date/time (`meeting_date`/`meeting_time`, schema-v10). Internal notes hidden from `staff`. Booking form fields use the Sales team's terms (Company Name, PIC, Contact Number, **Company Address** = `client_address`).
- **Home** — greeting, then a prominent **"Next Show" hero card** = the **closest upcoming show**: soonest non-done show dated **today or later** (KL time), so a past show that was never marked Done never sticks in the card — it auto-rolls forward as shows pass. Shows date/time, next meeting, expected attendance, its open Booking-SOP next-steps + open tasks; below it a "More Upcoming" list (also future-only), stats strip, and the team feed. *(A show only appears if it has a `show_date` and isn't Done.)*
- **Sales SOP / Booking checklist** (added 2026-06-30) — each show has a **SOP tab** with 4 sections seeded from the Sales team's workflow: Booking SOP (11 ordered steps), Pre-Event/Meeting Checklist, Document Checklist, After Event. Items support tick / add / remove / mark-**N/A** / note. Steps "Issue Second Invoice" / "Issue Final Invoice" auto-show a due date computed from `show_date` (−2 months / −2 weeks). The master template lives in `lib/sop.ts`; it seeds into `show_checklist_items` the first time a show is opened, then is fully editable **per show**. **Editing is Admin + Sales only** (`canEditSop` in lib/utils.ts); everyone else views read-only. Permissions are UI-enforced (RLS is permissive, matching tasks/documents). NOTE: this re-introduces seeded items — different from the old *operational* auto-tasks that were removed, because it's sales-owned, in its own tab, and every item is editable/removable. *Phase-2 backlog: an in-app editor for the master SOP template (currently code-only); optional file-link from Doc-checklist items to the Docs tab (`document_id` column already exists).*
- **Meeting Info** (2026-07-03) — a per-show **spec sheet** tab so Sales fills in show details and every department reads one source of truth. ~33 fixed template fields grouped into sections (Timing, Audience & Activity, Staging & Production, Effects & Lighting, Facilities & Parking, Permissions & Readings, Notes) — template in `lib/meetingInfo.ts` — **plus** an "Additional Info" area where a show can add its own extra label/value items. Single **Save** button. Stored as one JSONB column `shows.meeting_info` = `{ fields: {key:value}, extras: [{id,label,value}] }` (schema-v12). **Editing is Admin + Sales only** (`canEditMeetingInfo` = same rule as `canEditSop`); everyone else views read-only.
- **Tasks** — department-scoped permissions (dept head manages own dept only; staff can only tick; admin full). Preset SOP auto-tasks were removed by request — tasks are added manually. Personal "My Tasks" page also shows a **Booking SOP** section (open, non-N/A SOP steps across all shows, sorted by due date, tickable) for **Sales + Admin** only.
- **Leave system** — ⚠️ **currently HIDDEN (2026-06-30)**, may return later. Nav links (sidebar + mobile) removed, calendar leave layer off, `/dashboard/leave` redirects to home. The `leave_applications` table + data and `LeavePageClient.tsx` are kept intact — to restore, undo those edits (see git). Original behaviour: apply → pending → admin/`can_approve_leave` approve/decline, shown on the Calendar.
- **Home feed** — posts with pin (max 3, admin/dept-head), emoji reactions (👍❤️🎉👀), newest/oldest sort, threaded comments. Profile pages show the user's own posts. **@mentions** (2026-06-30) in posts + comments: type `@` for an autocomplete of staff (`MentionTextarea`), tagged people get a `mention` notification, mentions render highlighted (`MentionText`). Tagged user IDs stored in `posts.mentions` / `post_comments.mentions` (schema-v11). Helpers in `lib/mentions.ts`.
- **Team directory** (2026-06-30) — `/dashboard/team`, visible to everyone; searchable, grouped by department, inline cards (avatar, role, dept, email). "Team" nav entry in sidebar + mobile. No DB change (reads `profiles`).
- **Notifications** — in-app bell (Supabase realtime). Fires on: show confirmed, new post, **@mention** (in post/comment), new task in a department. `mention`/`new_post` route to the home feed. (Leave-related notifications are dormant while leave is hidden.) Sidebar shows a dot on the bell.
- **Staff & access** — admin-only page to invite by email, set role/dept, deactivate/remove. Self-healing "No Access" + Restore Access for the profile-exists-but-dropped-from-allowlist case.
- **Calendar** — Monday-first, scrollable month-tab strip (now runs **6 months back → 10 years forward**, with a **year dropdown** for quick jumps), Malaysia/KL public holidays. Shows are coloured by **stage only**: 🟢 Inquiry/soft-book = green, 🔴 Confirmed = brand red, past/Done = greyed; event-category colours removed. A show's **Setup → Rehearsal → Show → Dismantle** render as **one connected stage-coloured bar** (updated 2026-07-03): a full-bleed strip per day, rounded only on the run's ends so consecutive days join into a single line, with an **icon + label** per phase (Setup/Rehearsal/Show/Dismantle) — the Show day uses the solid shade. Phases only extend the bar when their date differs from the show date (single-day show = one "Show" block). Holidays seeded **2026–2036** (schema-v13): fixed-date + Agong + CNY exact/confident; Islamic holidays via tabular calendar (±1 day estimate); Thaipusam/Wesak/Deepavali intentionally not seeded past 2027 (can't be computed reliably — add from gazette).
- **Mobile** — bottom nav + "More" sheet; safe-area-inset handling so content/buttons aren't trapped behind the nav bar or iOS Safari URL bar.
- **Other** — tutorial modal, header live search, clickable dashboard stats, Mission/Vision/Values page. Legal entity name: **"MegaStar Arena KL Sdn Bhd"**.
- **Performance pass (2026-07-10)** — Vercel functions pinned to Singapore next to the DB (`vercel.json` → `sin1`); per-request cached `getAuthUser`/`getProfile`/`getUnreadCount` helpers (`lib/supabase/cached.ts`) shared by layout + every page (use these in new server components, don't re-query); independent queries parallelised with `Promise.all` on all dashboard pages; `app/dashboard/loading.tsx` skeleton gives instant nav feedback. Calendar fetches only the columns it renders.

---

## Database migrations (run manually in Supabase SQL Editor, in order)
`schema.sql` → `v2` → `v3` (leave) → `v4` (post pins/reactions/comments) → `v5` (allowed_emails, is_active,
staff role) → `v6` (event-dept constraint fix) → `v7` (notification-type fix + public holidays) →
`v8` (setup/rehearsal/dismantle dates) → `v9` (client_address + show_checklist_items / Sales SOP) →
`v10` (meeting_date/meeting_time on shows) → `v11` (`mention` notification type + posts/post_comments `mentions` arrays) →
`v12` (`meeting_info` JSONB on shows — the Meeting Info spec sheet) →
`v13` (Malaysia/KL public holidays 2028–2036).

---

## Open items / what's next
- [x] **`claude_readonly` introspection live (2026-07-04).** Jacky ran the CREATE ROLE SQL; `npm run db:schema` now regenerates `supabase/schema-current.md` from the live DB (see CLAUDE.md → Migrations & DB visibility). First snapshot: 14 tables, 11 CHECK constraints, 47 RLS policies. Two doc-vs-DB drifts surfaced: `shows.stage` CHECK still allows `day_of` (harmless; optional cleanup migration someday), and `profiles.role` has **no** CHECK constraint (old gotcha note was stale).
- [x] **schema-v12 + v13 run & deployed (2026-07-03).** Meeting Info tab, calendar connected phase-bar, 10-year range, and holidays through 2036 are all live and confirmed working. Thaipusam/Wesak/Deepavali still need adding from the gazette a few years at a time.
- [x] **schema-v9/v10/v11 run & deployed (2026-07-01).** Jacky confirmed v9–v11 are applied in Supabase; the full feature batch (Sales SOP, hidden Leave, Next Show hero, SOP-in-My-Tasks, Team directory, @mentions) + the hero "upcoming-only" fix are pushed to `main` and live on Vercel.
- [ ] Staff feedback backlog (remaining): email notifications (Resend) — esp. email-on-@mention → doc-approval workflow → direct messaging/chat. Leave system may also be re-enabled. *(Team directory + in-app @mentions: done 2026-06-30.)*
- [ ] 2027 Islamic/lunar holiday dates are **estimates** pending official gazette — re-check closer to each date.
- [ ] Historical past shows were never imported (staff re-enter manually for accuracy — by decision).
- [ ] No push notifications / PWA — in-app bell only by design. Revisit only if staff stop checking the app.
- [ ] Dev-workflow ideas parked from the 2026-07-04 session (no rush): branch + preview-deploy for big batches; a GitHub Action running `npm run harness:check`; slimming this file. Also flagged but not built: extending `claude_readonly` to a few aggregate row counts for staff-adoption visibility (Jacky's call — it's staff data).

---

## Escapes log

> One line per bug found in production **after** a batch was declared done. Every escape must end in
> either a new check in `npm run harness:check` (see `scripts/harness-check.mjs`) or an explicit
> "can't automate" note. **Escapes per batch trending down is the harness's real health metric** —
> not commits, features, or doc length.

- *(pre-log)* 2× enum added in TS but the DB CHECK constraint rejected inserts (`event` department → v6; `mention`/notification types → v7) — **automated:** enum↔CHECK drift check
- *(pre-log)* 2× content trapped behind the iOS bottom bar (mobile nav, Create Show button) — **automated:** safe-area check
- *(pre-log)* Next Show hero card stuck on a past never-marked-Done show — **can't automate** (date/state logic bug); class lesson: review time-dependent logic against "what does this look like next week?"
