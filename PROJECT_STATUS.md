# MegaStar Arena CRM — Project Status

> **Living document — status only.** Claude reads it automatically at the start of every session (it's
> imported by `CLAUDE.md`). Standing rules (workflow, migrations process, gotchas, code rules) live in
> `CLAUDE.md`; this file tracks *what exists and what's next*. Ask Claude to "update PROJECT_STATUS.md"
> at the end of a work session to keep it current.

**Last updated:** 2026-09-12

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
- **Shows & pipeline** — Kanban board (Inquiry/Confirmed/Done), each column **grouped by month** (2026-09-12) with a collapsible sticky subheader + per-month count: Inquiry/Confirmed run soonest-first and start open; **Past Events runs newest-month-first with older months collapsed** so it stays short as it grows; undated shows collect in a final "No date" group. Show detail has Overview/**SOP**/**Meeting Info**/Docs/Tasks/Activity tabs. New-show creation limited to admin + Sales/Management dept heads. Setup, Rehearsal & Dismantle each have an optional separate **date** (for multi-day shows). Internal notes hidden from `staff`. Booking form fields use the Sales team's terms (Company Name, PIC, Contact Number, **Company Address** = `client_address`). **Auto-archive (2026-07-27, schema-v14):** a nightly `pg_cron` job flips a **Confirmed** show to **Past Events** once its last event day — `COALESCE(teardown_date, show_date)` in KL time — has passed. Only Confirmed shows; reversible by hand. **Schedule slimmed 2026-07-27:** setup/rehearsal/dismantle keep their **dates** (they drive the calendar phase bar) but their **times** are gone, and **Next Meeting** date+time was dropped entirely (incl. the home hero) — detailed timings live in Meeting Info. Those DB columns still exist but are unread. **Overview** now shows a **Run of Show** card from Meeting Info (load in → rehearsal → doors open → show start → show end, plus backdrop / booth-counter open / aircond); empty fields hide, and the card disappears if nothing is filled in. Schedule rows share one label column so values align.
- **Home** — greeting, then a prominent **"Next Show" hero card** = the **closest upcoming show**: soonest non-done show dated **today or later** (KL time), so a past show that was never marked Done never sticks in the card — it auto-rolls forward as shows pass. Shows date/time, expected attendance, its open Booking-SOP next-steps + open tasks; below it a "More Upcoming" list (also future-only), stats strip, and the team feed.
- **Sales SOP / Booking checklist** (2026-06-30) — each show has a **SOP tab**, 4 sections seeded from the Sales workflow: Booking SOP (11 ordered steps), Pre-Event/Meeting, Document Checklist, After Event. Tick / add / remove / **N/A** / note, and **attach a file** to any item (2026-07-27 — uploads to the `documents` bucket, creates a Docs row and links it via `show_checklist_items.document_id`, so SOP attachments also appear in the show's Docs tab). Invoice steps auto-show a due date from `show_date` (−2 months / −2 weeks). Master template is code-only in `lib/sop.ts`, seeded on a show's first open, then editable per show. **Edit = Admin + Sales** (`canEditSop`); others read-only (UI-enforced; RLS permissive). Seeding is an **upsert** guarded by a unique index — see the duplicate-seeding escape below. *Phase-2: in-app editor for the master template.*
- **Meeting Info** (2026-07-03) — per-show **spec sheet** tab: ~33 template fields in sections (Timing, Audience & Activity, Staging & Production, Effects & Lighting, Facilities & Parking, Permissions & Readings, Notes) from `lib/meetingInfo.ts`, plus an "Additional Info" area for per-show extras. One Save button. Stored as JSONB `shows.meeting_info` = `{fields, extras}` (schema-v12). **Edit = Admin + Sales** (`canEditMeetingInfo`); others read-only. **This is now the authoritative source for show timings** — the Overview tab surfaces the key ones (below).
- **Tasks** — department-scoped permissions (dept head manages own dept only; staff can only tick; admin full). Preset SOP auto-tasks were removed by request — tasks are added manually. Personal "My Tasks" page also shows a **Booking SOP** section (open, non-N/A SOP steps across all shows, sorted by due date, tickable) for **Sales + Admin** only. Each show on My Tasks is a **collapsible accordion** (2026-07-27), collapsed by default with a count badge + red dot for overdue, and a corner link to open the show.
- **Leave system** — ⚠️ **HIDDEN (2026-06-30)**, may return. Nav links removed, calendar layer off, `/dashboard/leave` redirects home. Table, data and `LeavePageClient.tsx` intact — restore by undoing those edits (see git).
- **Home feed** — posts with pin (max 3, admin/dept-head), emoji reactions, newest/oldest sort, threaded comments; Profile shows your own posts. **@mentions** (schema-v11) in posts + comments: type `@` to autocomplete staff (`MentionTextarea`), tagged people get a `mention` notification, rendered highlighted (`MentionText`). Helpers in `lib/mentions.ts`.
- **Files — Drive-style** (2026-07-27) — shared components in `components/files/`: `FileThumb` (image thumbnails, colour-coded type tiles) and `FilePreview` (click to preview images/PDF/video/audio in an overlay instead of downloading; Esc closes). Used by the show **Docs** tab — which also gets inline **rename** (display name only; the stored file doesn't move) — and by **Company Hub**, which additionally has **folders** (schema-v17: `company_folders` + `company_files.folder_id`, nestable, breadcrumb nav, create/delete, move a file between folders). Deleting a folder keeps its files, dropping them back to the top level. Upload/rename/move/folders = admin + dept heads; everyone can view, preview and download.
- **Team directory** (2026-06-30) — `/dashboard/team`, visible to everyone; searchable, grouped by department, inline cards (avatar, role, dept, email). "Team" nav entry in sidebar + mobile. No DB change (reads `profiles`).
- **Broadcasts** (2026-07-27, schema-v15) — `/dashboard/broadcasts`, **admin + dept heads** (`canSendBroadcasts`). Manual team email: pick audience (all staff / department / role), write subject + body, then **"Open in mail app"** builds a `mailto:` BCC batch in the sender's own email to review and send. Plus save-as-draft, copy-emails, and draft/sent history in `broadcasts`. No email API or credentials. Modeled on Clancy. *Phase-2: automated send via a Gmail app password (nodemailer).*
- **Notifications** — in-app bell (Supabase realtime). Fires on: show confirmed, new post, **@mention** (in post/comment), new task in a department. `mention`/`new_post` route to the home feed. (Leave-related notifications are dormant while leave is hidden.) Sidebar shows a dot on the bell.
- **Staff & access** — admin-only page to invite by email, set role/dept, deactivate/remove. Self-healing "No Access" + Restore Access for the profile-exists-but-dropped-from-allowlist case.
- **Calendar** — Monday-first, scrollable month-tab strip (now runs **6 months back → 10 years forward**, with a **year dropdown** for quick jumps), Malaysia/KL public holidays. Shows coloured by **stage only**: 🟢 Inquiry = green, 🔴 Confirmed = brand red, past/Done greyed. A show's **Setup → Rehearsal → Show → Dismantle** render as **one connected bar** — a full-bleed strip per day, rounded only at the run's ends, icon + label per phase, Show day solid. Phases extend the bar only when their date differs from the show date. Holidays seeded **2026–2036** (schema-v13): fixed-date + Agong + CNY exact; Islamic via tabular calendar (±1 day); Thaipusam/Wesak/Deepavali not seeded past 2027 — add from gazette.
- **Mobile** — bottom nav + "More" sheet; safe-area-inset handling so content/buttons aren't trapped behind the nav bar or iOS Safari URL bar.
- **Other** — tutorial modal, header live search, clickable dashboard stats, Mission/Vision/Values page. Legal entity name: **"MegaStar Arena KL Sdn Bhd"**.
- **Performance (2026-07-10)** — Vercel pinned to `sin1` next to the DB; per-request cached `getAuthUser`/`getProfile`/`getUnreadCount` in `lib/supabase/cached.ts` — **use these in new server components, don't re-query**; queries parallelised with `Promise.all` on every page; `app/dashboard/loading.tsx` skeleton for instant nav.

---

## Database migrations (run manually in Supabase SQL Editor, in order)
`schema.sql` → `v2` → `v3` (leave) → `v4` (post pins/reactions/comments) → `v5` (allowed_emails, is_active,
staff role) → `v6` (event-dept constraint fix) → `v7` (notification-type fix + public holidays) →
`v8` (setup/rehearsal/dismantle dates) → `v9` (client_address + show_checklist_items / Sales SOP) →
`v10` (meeting_date/meeting_time on shows) → `v11` (`mention` notification type + posts/post_comments `mentions` arrays) →
`v12` (`meeting_info` JSONB on shows — the Meeting Info spec sheet) →
`v13` (Malaysia/KL public holidays 2028–2036) →
`v14` (pg_cron nightly job: auto-archive past Confirmed shows → Past Events) →
`v15` (`broadcasts` table — manual team email broadcasts) →
`v16` (SOP duplicate cleanup + unique index) → `v17` (`company_folders` + `company_files.folder_id`).

---

## Open items / what's next
- [x] **`claude_readonly` introspection live (2026-07-04).** `npm run db:schema` regenerates `supabase/schema-current.md` from the live DB. Two known doc-vs-DB drifts: `shows.stage` CHECK still allows `day_of` (harmless), and `profiles.role` has **no** CHECK constraint.
- [x] **All migrations through v15 are run & live** (v9–v11 on 2026-07-01, v12–v13 on 07-03, v14 on 07-24, v15 on 07-27). Thaipusam/Wesak/Deepavali still need gazetted dates past 2027.
- [ ] **Run `schema-v14.sql`** in Supabase (enable pg_cron + auto-archive job). Until run, past Confirmed shows stay Confirmed. After running, tell Claude → `npm run db:schema` to refresh the snapshot (v14 adds no schema, only a cron job + data update, so the snapshot content is unchanged — just its date).
- [ ] **Run `schema-v16.sql` + `schema-v17.sql`** in Supabase. v16 de-duplicates SOP items and adds the unique index (until run, existing duplicates stay and can recur); v17 adds Company Hub folders (until run, the Hub errors). After running, tell Claude → `npm run db:schema`.
- [ ] **Automated email (Resend/briefing) — DROPPED 2026-07-27** in favour of the manual **Broadcasts** tab (built). Could revisit: automated one-click send via a Gmail app password (nodemailer), and/or the weekly upcoming-shows briefing. *(doc-approval workflow, direct chat still backlog; Leave may be re-enabled.)*
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
- 2026-07-28 — **SOP items seeded twice** ("double data"). Check-then-insert seeding raced: two concurrent first-opens both saw an empty checklist and each inserted all 26 rows. Fixed in v16 (dedupe + unique index on `show_id,section,title`); seed is now `upsert … ignoreDuplicates`. **Can't automate** — no static check catches a read-then-write race. Class lesson: **any insert guarded only by "does it exist yet?" needs a DB uniqueness constraint.**
