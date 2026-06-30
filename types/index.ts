export type Department = 'management' | 'finance' | 'operations' | 'tech' | 'sales' | 'event'
export type UserRole = 'admin' | 'department_head' | 'staff'
export type ShowStage = 'inquiry' | 'confirmed' | 'day_of' | 'done'
export type EventType = 'concert' | 'corporate' | 'private_function' | 'other'
export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type DocumentCategory = 'tech_rider' | 'venue_spec' | 'contract' | 'quotation' | 'invoice' | 'site_visit' | 'other'
export type NotificationType = 'show_update' | 'task_assigned' | 'document_uploaded' | 'stage_change' | 'leave_update' | 'new_post' | 'mention'
export type LeaveType = 'annual' | 'medical' | 'emergency'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type ChecklistSection = 'booking_sop' | 'pre_event' | 'doc_checklist' | 'after_event'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  department: Department | null
  role: UserRole | null
  can_approve_leave?: boolean
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface AllowedEmail {
  email: string
  full_name: string | null
  department: Department | null
  role: UserRole | null
  created_at: string
}

export interface Show {
  id: string
  title: string
  client_name: string
  client_contact: string | null
  client_email: string | null
  client_phone: string | null
  client_address: string | null
  event_type: EventType
  stage: ShowStage
  show_date: string | null
  setup_date: string | null
  setup_time: string | null
  rehearsal_date: string | null
  rehearsal_time: string | null
  show_time: string | null
  teardown_date: string | null
  teardown_time: string | null
  meeting_date: string | null
  meeting_time: string | null
  expected_attendance: number | null
  notes: string | null
  internal_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Document {
  id: string
  show_id: string
  name: string
  file_url: string
  file_size: number | null
  file_type: string | null
  category: DocumentCategory
  uploaded_by: string | null
  created_at: string
  profiles?: Profile
}

export interface Task {
  id: string
  show_id: string
  title: string
  description: string | null
  department: Department
  assigned_to: string | null
  status: TaskStatus
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface ShowChecklistItem {
  id: string
  show_id: string
  section: ChecklistSection
  title: string
  position: number
  is_done: boolean
  is_na: boolean
  allow_na: boolean
  note: string | null
  due_date: string | null
  relative_due: string | null
  document_id: string | null
  done_by: string | null
  done_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  related_show_id: string | null
  read: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  show_id: string
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
  profiles?: Profile
}

export interface PostReaction {
  id: string
  post_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  mentions?: string[] | null
  created_at: string
  updated_at: string
  profiles?: Profile | null
}

export interface Post {
  id: string
  content: string
  mentions?: string[] | null
  is_pinned?: boolean
  pinned_at?: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  post_reactions?: PostReaction[]
  post_comments?: PostComment[]
}

export interface CompanyFile {
  id: string
  name: string
  description: string | null
  file_url: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string | null
  created_at: string
  profiles?: Profile
}

export interface PublicHoliday {
  id: string
  date: string
  name: string
  created_at: string
}

export interface LeaveApplication {
  id: string
  user_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  reason: string | null
  status: LeaveStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
  profiles?: Profile | null
  reviewer?: Profile | null
}
