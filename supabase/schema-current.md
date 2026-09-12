# Live database schema — ohtkqgvzagipbmpyozae

> **GENERATED FILE — do not edit.** Regenerate with `npm run db:schema`.
> Snapshot taken: 2026-09-12T04:58:54.369Z
> This reflects the *actual* database, not the intent of the schema-v*.sql history.

## ⚠️ All CHECK constraints (verify before adding any enum value)

- `documents` — `documents_category_check`: CHECK ((category = ANY (ARRAY['tech_rider'::text, 'venue_spec'::text, 'contract'::text, 'quotation'::text, 'invoice'::text, 'site_visit'::text, 'other'::text])))
- `leave_applications` — `leave_applications_leave_type_check`: CHECK ((leave_type = ANY (ARRAY['annual'::text, 'medical'::text, 'emergency'::text])))
- `leave_applications` — `leave_applications_status_check`: CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
- `notifications` — `notifications_type_check`: CHECK ((type = ANY (ARRAY['show_update'::text, 'task_assigned'::text, 'document_uploaded'::text, 'stage_change'::text, 'leave_update'::text, 'new_post'::text, 'mention'::text])))
- `post_reactions` — `post_reactions_emoji_check`: CHECK ((emoji = ANY (ARRAY['👍'::text, '❤️'::text, '🎉'::text, '👀'::text])))
- `profiles` — `profiles_department_check`: CHECK ((department = ANY (ARRAY['management'::text, 'finance'::text, 'operations'::text, 'tech'::text, 'sales'::text, 'event'::text])))
- `show_checklist_items` — `show_checklist_items_section_check`: CHECK ((section = ANY (ARRAY['booking_sop'::text, 'pre_event'::text, 'doc_checklist'::text, 'after_event'::text])))
- `shows` — `shows_event_type_check`: CHECK ((event_type = ANY (ARRAY['concert'::text, 'corporate'::text, 'private_function'::text, 'other'::text])))
- `shows` — `shows_stage_check`: CHECK ((stage = ANY (ARRAY['inquiry'::text, 'confirmed'::text, 'day_of'::text, 'done'::text])))
- `tasks` — `tasks_department_check`: CHECK ((department = ANY (ARRAY['management'::text, 'finance'::text, 'operations'::text, 'tech'::text, 'sales'::text, 'event'::text])))
- `tasks` — `tasks_status_check`: CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'done'::text])))

## Tables (16)

### activity_log

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| show_id | uuid | NO |  |
| user_id | uuid | YES |  |
| action | text | NO |  |
| details | jsonb | YES |  |
| created_at | timestamp with time zone | YES | now() |

Constraints:
- FOREIGN KEY `activity_log_show_id_fkey`: FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
- FOREIGN KEY `activity_log_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES profiles(id)
- PRIMARY KEY `activity_log_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated users can log activity` (INSERT to {authenticated}) check: true
- policy `Authenticated users can view activity` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX activity_log_pkey ON public.activity_log USING btree (id)

### allowed_emails

| column | type | nullable | default |
|---|---|---|---|
| email | text | NO |  |
| full_name | text | YES |  |
| department | text | YES |  |
| role | text | YES | 'staff'::text |
| created_at | timestamp with time zone | YES | now() |

Constraints:
- PRIMARY KEY `allowed_emails_pkey`: PRIMARY KEY (email)

RLS: enabled
- policy `allowed_admin_delete` (DELETE to {authenticated}) using: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))
- policy `allowed_admin_insert` (INSERT to {authenticated}) check: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))
- policy `allowed_admin_update` (UPDATE to {authenticated}) using: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))
- policy `allowed_select` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX allowed_emails_pkey ON public.allowed_emails USING btree (email)

### broadcasts

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| subject | text | NO |  |
| body | text | NO |  |
| audience | text | NO | 'all'::text |
| recipient_count | integer | NO | 0 |
| status | text | NO | 'draft'::text |
| created_by | uuid | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

Constraints:
- FOREIGN KEY `broadcasts_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
- PRIMARY KEY `broadcasts_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated can delete broadcasts` (DELETE to {authenticated}) using: true
- policy `Authenticated can insert broadcasts` (INSERT to {authenticated}) check: true
- policy `Authenticated can update broadcasts` (UPDATE to {authenticated}) using: true
- policy `Authenticated can view broadcasts` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX broadcasts_pkey ON public.broadcasts USING btree (id)
- CREATE INDEX idx_broadcasts_created_at ON public.broadcasts USING btree (created_at DESC)

### company_files

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO |  |
| description | text | YES |  |
| file_url | text | NO |  |
| file_size | bigint | YES |  |
| file_type | text | YES |  |
| uploaded_by | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |
| folder_id | uuid | YES |  |

Constraints:
- FOREIGN KEY `company_files_folder_id_fkey`: FOREIGN KEY (folder_id) REFERENCES company_folders(id) ON DELETE SET NULL
- FOREIGN KEY `company_files_uploaded_by_fkey`: FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL
- PRIMARY KEY `company_files_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated users can view company files` (SELECT to {authenticated}) using: true
- policy `Department heads can upload company files` (INSERT to {authenticated}) check: true
- policy `Users can delete own company files or admins` (DELETE to {authenticated}) using: ((auth.uid() = uploaded_by) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))

Indexes:
- CREATE UNIQUE INDEX company_files_pkey ON public.company_files USING btree (id)
- CREATE INDEX idx_company_files_folder ON public.company_files USING btree (folder_id)

### company_folders

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO |  |
| parent_id | uuid | YES |  |
| created_by | uuid | YES |  |
| created_at | timestamp with time zone | NO | now() |

Constraints:
- FOREIGN KEY `company_folders_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
- FOREIGN KEY `company_folders_parent_id_fkey`: FOREIGN KEY (parent_id) REFERENCES company_folders(id) ON DELETE CASCADE
- PRIMARY KEY `company_folders_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated can delete folders` (DELETE to {authenticated}) using: true
- policy `Authenticated can insert folders` (INSERT to {authenticated}) check: true
- policy `Authenticated can update folders` (UPDATE to {authenticated}) using: true
- policy `Authenticated can view folders` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX company_folders_pkey ON public.company_folders USING btree (id)
- CREATE INDEX idx_company_folders_parent ON public.company_folders USING btree (parent_id)

### documents

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| show_id | uuid | NO |  |
| name | text | NO |  |
| file_url | text | NO |  |
| file_size | bigint | YES |  |
| file_type | text | YES |  |
| category | text | YES | 'other'::text |
| uploaded_by | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |

Constraints:
- CHECK `documents_category_check`: CHECK ((category = ANY (ARRAY['tech_rider'::text, 'venue_spec'::text, 'contract'::text, 'quotation'::text, 'invoice'::text, 'site_visit'::text, 'other'::text])))
- FOREIGN KEY `documents_show_id_fkey`: FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
- FOREIGN KEY `documents_uploaded_by_fkey`: FOREIGN KEY (uploaded_by) REFERENCES profiles(id)
- PRIMARY KEY `documents_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated users can delete documents` (DELETE to {authenticated}) using: true
- policy `Authenticated users can upload documents` (INSERT to {authenticated}) check: true
- policy `Authenticated users can view documents` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id)

### leave_applications

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO |  |
| leave_type | text | NO |  |
| start_date | date | NO |  |
| end_date | date | NO |  |
| days | integer | NO |  |
| reason | text | YES |  |
| status | text | YES | 'pending'::text |
| reviewed_by | uuid | YES |  |
| reviewed_at | timestamp with time zone | YES |  |
| review_note | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

Constraints:
- CHECK `leave_applications_leave_type_check`: CHECK ((leave_type = ANY (ARRAY['annual'::text, 'medical'::text, 'emergency'::text])))
- CHECK `leave_applications_status_check`: CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
- FOREIGN KEY `leave_applications_reviewed_by_fkey`: FOREIGN KEY (reviewed_by) REFERENCES profiles(id)
- FOREIGN KEY `leave_applications_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
- PRIMARY KEY `leave_applications_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `leave_delete` (DELETE to {authenticated}) using: ((auth.uid() = user_id) AND (status = 'pending'::text))
- policy `leave_insert` (INSERT to {authenticated}) check: (auth.uid() = user_id)
- policy `leave_select` (SELECT to {authenticated}) using: ((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.can_approve_leave = true))))))
- policy `leave_update` (UPDATE to {authenticated}) using: (((auth.uid() = user_id) AND (status = 'pending'::text)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.can_approve_leave = true))))))

Indexes:
- CREATE UNIQUE INDEX leave_applications_pkey ON public.leave_applications USING btree (id)

### notifications

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO |  |
| title | text | NO |  |
| message | text | NO |  |
| type | text | NO |  |
| related_show_id | uuid | YES |  |
| read | boolean | YES | false |
| created_at | timestamp with time zone | YES | now() |

Constraints:
- CHECK `notifications_type_check`: CHECK ((type = ANY (ARRAY['show_update'::text, 'task_assigned'::text, 'document_uploaded'::text, 'stage_change'::text, 'leave_update'::text, 'new_post'::text, 'mention'::text])))
- FOREIGN KEY `notifications_related_show_id_fkey`: FOREIGN KEY (related_show_id) REFERENCES shows(id) ON DELETE SET NULL
- FOREIGN KEY `notifications_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
- PRIMARY KEY `notifications_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated can create notifications` (INSERT to {authenticated}) check: true
- policy `Users can update own notifications` (UPDATE to {authenticated}) using: (user_id = auth.uid())
- policy `Users can view own notifications` (SELECT to {authenticated}) using: (user_id = auth.uid())

Indexes:
- CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)

### post_comments

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| post_id | uuid | NO |  |
| user_id | uuid | NO |  |
| content | text | NO |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| mentions | uuid[] | YES | '{}'::uuid[] |

Constraints:
- FOREIGN KEY `post_comments_post_id_fkey`: FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
- FOREIGN KEY `post_comments_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
- PRIMARY KEY `post_comments_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `comments_delete` (DELETE to {authenticated}) using: ((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
- policy `comments_insert` (INSERT to {authenticated}) check: (auth.uid() = user_id)
- policy `comments_select` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX post_comments_pkey ON public.post_comments USING btree (id)

### post_reactions

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| post_id | uuid | NO |  |
| user_id | uuid | NO |  |
| emoji | text | NO |  |
| created_at | timestamp with time zone | YES | now() |

Constraints:
- CHECK `post_reactions_emoji_check`: CHECK ((emoji = ANY (ARRAY['👍'::text, '❤️'::text, '🎉'::text, '👀'::text])))
- FOREIGN KEY `post_reactions_post_id_fkey`: FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
- FOREIGN KEY `post_reactions_user_id_fkey`: FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
- PRIMARY KEY `post_reactions_pkey`: PRIMARY KEY (id)
- UNIQUE `post_reactions_post_id_user_id_emoji_key`: UNIQUE (post_id, user_id, emoji)

RLS: enabled
- policy `reactions_delete` (DELETE to {authenticated}) using: (auth.uid() = user_id)
- policy `reactions_insert` (INSERT to {authenticated}) check: (auth.uid() = user_id)
- policy `reactions_select` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX post_reactions_pkey ON public.post_reactions USING btree (id)
- CREATE UNIQUE INDEX post_reactions_post_id_user_id_emoji_key ON public.post_reactions USING btree (post_id, user_id, emoji)

### posts

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| content | text | NO |  |
| created_by | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| is_pinned | boolean | YES | false |
| pinned_at | timestamp with time zone | YES |  |
| mentions | uuid[] | YES | '{}'::uuid[] |

Constraints:
- FOREIGN KEY `posts_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
- PRIMARY KEY `posts_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated users can create posts` (INSERT to {authenticated}) check: (auth.uid() = created_by)
- policy `Authenticated users can view posts` (SELECT to {authenticated}) using: true
- policy `Users can delete own posts or admins` (DELETE to {authenticated}) using: ((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
- policy `Users can update own posts` (UPDATE to {authenticated}) using: (auth.uid() = created_by)

Indexes:
- CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id)

### profiles

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO |  |
| email | text | NO |  |
| full_name | text | YES |  |
| avatar_url | text | YES |  |
| department | text | YES |  |
| role | text | YES | 'department_head'::text |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| can_approve_leave | boolean | YES | false |
| is_active | boolean | YES | true |

Constraints:
- CHECK `profiles_department_check`: CHECK ((department = ANY (ARRAY['management'::text, 'finance'::text, 'operations'::text, 'tech'::text, 'sales'::text, 'event'::text])))
- FOREIGN KEY `profiles_id_fkey`: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
- PRIMARY KEY `profiles_pkey`: PRIMARY KEY (id)
- UNIQUE `profiles_email_key`: UNIQUE (email)

RLS: enabled
- policy `Authenticated users can view all profiles` (SELECT to {authenticated}) using: true
- policy `Users can insert own profile` (INSERT to {authenticated}) check: (auth.uid() = id)
- policy `Users can update own profile` (UPDATE to {authenticated}) using: (auth.uid() = id)
- policy `profiles_admin_update` (UPDATE to {authenticated}) using: (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))
- policy `profiles_self_insert` (INSERT to {authenticated}) check: (id = auth.uid())

Indexes:
- CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email)
- CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)

### public_holidays

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| date | date | NO |  |
| name | text | NO |  |
| created_at | timestamp with time zone | YES | now() |

Constraints:
- PRIMARY KEY `public_holidays_pkey`: PRIMARY KEY (id)
- UNIQUE `public_holidays_date_name_key`: UNIQUE (date, name)

RLS: enabled
- policy `holidays_select` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX public_holidays_date_name_key ON public.public_holidays USING btree (date, name)
- CREATE UNIQUE INDEX public_holidays_pkey ON public.public_holidays USING btree (id)

### show_checklist_items

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| show_id | uuid | NO |  |
| section | text | NO |  |
| title | text | NO |  |
| position | integer | NO | 0 |
| is_done | boolean | NO | false |
| is_na | boolean | NO | false |
| allow_na | boolean | NO | false |
| note | text | YES |  |
| due_date | date | YES |  |
| relative_due | text | YES |  |
| document_id | uuid | YES |  |
| done_by | uuid | YES |  |
| done_at | timestamp with time zone | YES |  |
| created_by | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

Constraints:
- CHECK `show_checklist_items_section_check`: CHECK ((section = ANY (ARRAY['booking_sop'::text, 'pre_event'::text, 'doc_checklist'::text, 'after_event'::text])))
- FOREIGN KEY `show_checklist_items_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id)
- FOREIGN KEY `show_checklist_items_document_id_fkey`: FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
- FOREIGN KEY `show_checklist_items_done_by_fkey`: FOREIGN KEY (done_by) REFERENCES profiles(id)
- FOREIGN KEY `show_checklist_items_show_id_fkey`: FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
- PRIMARY KEY `show_checklist_items_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated can delete checklist` (DELETE to {authenticated}) using: true
- policy `Authenticated can insert checklist` (INSERT to {authenticated}) check: true
- policy `Authenticated can update checklist` (UPDATE to {authenticated}) using: true
- policy `Authenticated can view checklist` (SELECT to {authenticated}) using: true

Indexes:
- CREATE INDEX idx_checklist_show ON public.show_checklist_items USING btree (show_id)
- CREATE UNIQUE INDEX show_checklist_items_pkey ON public.show_checklist_items USING btree (id)
- CREATE UNIQUE INDEX uq_checklist_show_section_title ON public.show_checklist_items USING btree (show_id, section, title)

### shows

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title | text | NO |  |
| client_name | text | NO |  |
| client_contact | text | YES |  |
| client_email | text | YES |  |
| client_phone | text | YES |  |
| event_type | text | NO | 'concert'::text |
| stage | text | NO | 'inquiry'::text |
| show_date | date | YES |  |
| setup_time | time without time zone | YES |  |
| show_time | time without time zone | YES |  |
| teardown_time | time without time zone | YES |  |
| expected_attendance | integer | YES |  |
| notes | text | YES |  |
| internal_notes | text | YES |  |
| created_by | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| rehearsal_time | time without time zone | YES |  |
| setup_date | date | YES |  |
| rehearsal_date | date | YES |  |
| teardown_date | date | YES |  |
| client_address | text | YES |  |
| meeting_date | date | YES |  |
| meeting_time | time without time zone | YES |  |
| meeting_info | jsonb | YES |  |

Constraints:
- CHECK `shows_event_type_check`: CHECK ((event_type = ANY (ARRAY['concert'::text, 'corporate'::text, 'private_function'::text, 'other'::text])))
- CHECK `shows_stage_check`: CHECK ((stage = ANY (ARRAY['inquiry'::text, 'confirmed'::text, 'day_of'::text, 'done'::text])))
- FOREIGN KEY `shows_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id)
- PRIMARY KEY `shows_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated users can create shows` (INSERT to {authenticated}) check: true
- policy `Authenticated users can delete shows` (DELETE to {authenticated}) using: true
- policy `Authenticated users can update shows` (UPDATE to {authenticated}) using: true
- policy `Authenticated users can view shows` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX shows_pkey ON public.shows USING btree (id)

### tasks

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| show_id | uuid | NO |  |
| title | text | NO |  |
| description | text | YES |  |
| department | text | NO |  |
| assigned_to | uuid | YES |  |
| status | text | YES | 'pending'::text |
| due_date | date | YES |  |
| created_by | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

Constraints:
- CHECK `tasks_department_check`: CHECK ((department = ANY (ARRAY['management'::text, 'finance'::text, 'operations'::text, 'tech'::text, 'sales'::text, 'event'::text])))
- CHECK `tasks_status_check`: CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'done'::text])))
- FOREIGN KEY `tasks_assigned_to_fkey`: FOREIGN KEY (assigned_to) REFERENCES profiles(id)
- FOREIGN KEY `tasks_created_by_fkey`: FOREIGN KEY (created_by) REFERENCES profiles(id)
- FOREIGN KEY `tasks_show_id_fkey`: FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
- PRIMARY KEY `tasks_pkey`: PRIMARY KEY (id)

RLS: enabled
- policy `Authenticated users can create tasks` (INSERT to {authenticated}) check: true
- policy `Authenticated users can delete tasks` (DELETE to {authenticated}) using: true
- policy `Authenticated users can update tasks` (UPDATE to {authenticated}) using: true
- policy `Authenticated users can view tasks` (SELECT to {authenticated}) using: true

Indexes:
- CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id)

## Functions (1)

- handle_new_user (function)
