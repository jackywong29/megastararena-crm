import { format, parseISO, subMonths, subWeeks } from 'date-fns'
import type { ChecklistSection } from '@/types'

// ── Section metadata (drives display order + headings) ──────────
export const CHECKLIST_SECTIONS: {
  key: ChecklistSection
  label: string
  emoji: string
  ordered: boolean
}[] = [
  { key: 'booking_sop',   label: 'Booking SOP',                  emoji: '📋', ordered: true  },
  { key: 'pre_event',     label: 'Pre-Event / Meeting Checklist', emoji: '🗓️', ordered: false },
  { key: 'doc_checklist', label: 'Document Checklist',            emoji: '📁', ordered: false },
  { key: 'after_event',   label: 'After Event',                  emoji: '✅', ordered: false },
]

type RelativeDue = 'event_minus_2months' | 'event_minus_2weeks'
type TemplateItem = { title: string; allow_na?: boolean; relative_due?: RelativeDue }

// ── The master Sales SOP (seeded into every show, then editable per show) ──
export const SOP_TEMPLATE: Record<ChecklistSection, TemplateItem[]> = {
  booking_sop: [
    { title: 'Inquiry' },
    { title: 'Site Visit / Pencil Book' },
    { title: 'Send Booking Form' },
    { title: 'Issue Quotation' },
    { title: 'Issue Proforma Invoice (50% deposit)' },
    { title: 'Issue Venue Letter' },
    { title: 'Create WhatsApp Group / Client Support' },
    { title: 'Issue Second Invoice (30% rental)', relative_due: 'event_minus_2months' },
    { title: 'Issue Final Invoice (20% balance)', relative_due: 'event_minus_2weeks' },
    { title: 'Ops & Technical Meeting (confirm final event details)' },
    { title: 'Collect Additional Charges', allow_na: true },
  ],
  pre_event: [
    { title: 'Production Schedule' },
    { title: 'Floor Plan / Seating Plan' },
    { title: 'Operation Form' },
    { title: 'Work Application Form (Permit)' },
    { title: 'Carplate List (B3 Reserved, Valet, B1 Van & Ambulance Parking)' },
    { title: 'Digital TV Signage (seat categories at both entrances)' },
    { title: 'Technical Equipment (Lighting, Audio, LED, Laser)' },
  ],
  doc_checklist: [
    { title: 'Signed T&Cs' },
    { title: '101 Billboard Artwork' },
    { title: 'DBKL Permit' },
    { title: 'PUSPAL Permit' },
    { title: 'Public Liability Insurance' },
    { title: 'Drone Contract', allow_na: true },
  ],
  after_event: [
    { title: 'Collect Signed Poster' },
    { title: 'Request Event Footage from organiser', allow_na: true },
    { title: 'Post Social Media' },
    { title: 'Archive Event Reference' },
  ],
}

// Build the rows to insert when first seeding a show's checklist.
export function buildChecklistRows(showId: string, createdBy: string | null) {
  const rows: Record<string, unknown>[] = []
  for (const { key } of CHECKLIST_SECTIONS) {
    SOP_TEMPLATE[key].forEach((item, i) => {
      rows.push({
        show_id: showId,
        section: key,
        title: item.title,
        position: i,
        allow_na: item.allow_na ?? false,
        relative_due: item.relative_due ?? null,
        created_by: createdBy,
      })
    })
  }
  return rows
}

// Turn a relative-due marker + the show date into an actual date (yyyy-MM-dd).
export function computeRelativeDue(relative: string | null, showDate: string | null): string | null {
  if (!relative || !showDate) return null
  try {
    const d = parseISO(showDate)
    if (relative === 'event_minus_2months') return format(subMonths(d, 2), 'yyyy-MM-dd')
    if (relative === 'event_minus_2weeks')  return format(subWeeks(d, 2), 'yyyy-MM-dd')
  } catch { return null }
  return null
}
