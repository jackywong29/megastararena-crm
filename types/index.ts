export type Department = 'management' | 'finance' | 'operations' | 'tech' | 'sales'
export type UserRole = 'admin' | 'department_head'
export type ShowStage = 'inquiry' | 'confirmed' | 'day_of' | 'done'
export type EventType = 'concert' | 'corporate' | 'private_function' | 'other'
export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type DocumentCategory = 'tech_rider' | 'venue_spec' | 'contract' | 'quotation' | 'invoice' | 'site_visit' | 'other'
export type NotificationType = 'show_update' | 'task_assigned' | 'document_uploaded' | 'stage_change'
export type LeaveType = 'annual' | 'medical' | 'emergency'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  department: Department | null
  role: UserRole | null
  can_approve_leave?: boolean
  created_at: string
  updated_at: string
}

export interface Show {
  id: string
  title: string
  client_name: string
  client_contact: string | null
  client_email: string | null
  client_phone: string | null
  event_type: EventType
  stage: ShowStage
  show_date: string | null
  setup_time: string | null
  show_time: string | null
  teardown_time: string | null
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

export interface Post {
  id: string
  content: string
  created_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
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
