import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { ShowStage, EventType, Department, TaskStatus, DocumentCategory } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  try { return format(parseISO(date), 'MMM d, yyyy') } catch { return '—' }
}

export function formatTime(time: string | null): string {
  if (!time) return '—'
  try {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  } catch { return '—' }
}

export function timeAgo(date: string): string {
  try { return formatDistanceToNow(parseISO(date), { addSuffix: true }) } catch { return '' }
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const STAGE_LABELS: Record<ShowStage, string> = {
  inquiry:   'Inquiry',
  confirmed: 'Confirmed',
  day_of:    'Show Day',
  done:      'Past Events',
}

export const STAGE_COLORS: Record<ShowStage, { bg: string; text: string; border: string }> = {
  inquiry:   { bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/30' },
  confirmed: { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  day_of:    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  done:      { bg: 'bg-zinc-700/40',    text: 'text-zinc-400',    border: 'border-zinc-600/40' },
}

export const STAGE_HEADER_COLORS: Record<ShowStage, string> = {
  inquiry:   'bg-amber-500',
  confirmed: 'bg-blue-500',
  day_of:    'bg-emerald-500',
  done:      'bg-zinc-600',
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  concert:          'Concert',
  corporate:        'Corporate',
  private_function: 'Private Function',
  other:            'Other',
}

export const EVENT_TYPE_COLORS: Record<EventType, { bg: string; text: string }> = {
  concert:          { bg: 'bg-[#E7191F]/20', text: 'text-red-400' },
  corporate:        { bg: 'bg-sky-500/20',    text: 'text-sky-400' },
  private_function: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  other:            { bg: 'bg-zinc-700/40',   text: 'text-zinc-400' },
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  management: 'Management',
  finance:    'Finance',
  operations: 'Operations',
  tech:       'Tech',
  sales:      'Sales & Marketing',
}

export const DEPARTMENT_COLORS: Record<Department, { bg: string; text: string }> = {
  management: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  finance:    { bg: 'bg-green-500/20',  text: 'text-green-400' },
  operations: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  tech:       { bg: 'bg-cyan-500/20',   text: 'text-cyan-400' },
  sales:      { bg: 'bg-pink-500/20',   text: 'text-pink-400' },
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  done:        'Done',
}

export const DOC_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  tech_rider:  'Tech Rider',
  venue_spec:  'Venue Spec',
  contract:    'Contract',
  quotation:   'Quotation',
  invoice:     'Invoice',
  site_visit:  'Site Visit',
  other:       'Other',
}

export const STAGE_ORDER: ShowStage[] = ['inquiry', 'confirmed', 'day_of', 'done']

export const DEPARTMENTS: Department[] = ['management', 'finance', 'operations', 'tech', 'sales']

export function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export const STAGE_SOP_TASKS: Partial<Record<ShowStage, Partial<Record<Department, string[]>>>> = {
  inquiry: {
    sales: [
      'Send venue specs to client',
      'Conduct site visit',
      'Issue quotation with T&C',
      'Receive signed quotation',
      'Create WhatsApp group',
      'Lock calendar date',
      'Alignment meeting',
    ],
  },
  confirmed: {
    finance: [
      'Issue invoice to client',
      'Collect deposit payment',
      'Confirm payment received',
      'Final balance collection',
    ],
    management: [
      'Approve quotation',
      'Sign-off event plan',
    ],
  },
  day_of: {
    tech: [
      'Collect tech rider from client',
      'Confirm PA & lighting setup',
      'Receive production schedule from client',
      'Show-day standby',
    ],
    operations: [
      'Setup checklist',
      'Staff roster',
      'Staff briefing',
    ],
  },
  done: {
    tech: [
      'Post-show dismantle',
    ],
    operations: [
      'Post-event cleanup',
    ],
    management: [
      'Post-event debrief',
    ],
  },
}
