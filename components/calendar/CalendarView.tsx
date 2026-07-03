'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Show, ShowStage, LeaveApplication, PublicHoliday } from '@/types'

interface CalendarViewProps {
  shows: Show[]
  leaves?: LeaveApplication[]
  holidays?: PublicHoliday[]
  isManager?: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Shows are coloured by STAGE only — Inquiry (soft book) vs Confirmed — plus a
// greyed style for past/Done shows. No more event-category colours.
const STAGE_STYLE: Record<string, { chip: string; dot: string; label: string }> = {
  inquiry:   { chip: 'bg-emerald-500/20 text-emerald-300', dot: 'bg-emerald-500', label: 'Inquiry (soft book)' },
  confirmed: { chip: 'bg-[#E7191F]/20 text-red-300',       dot: 'bg-[#E7191F]',   label: 'Confirmed' },
  day_of:    { chip: 'bg-emerald-500/20 text-emerald-300', dot: 'bg-emerald-500', label: 'Confirmed' },
  done:      { chip: 'bg-zinc-700/40 text-zinc-500',       dot: 'bg-zinc-600',    label: 'Past Event' },
}

// Setup / Rehearsal / Dismantle get their own distinct chips so the multi-day
// footprint of a show is visible at a glance.
const PHASE_STYLE: Record<string, { chip: string; dot: string; label: string }> = {
  setup:     { chip: 'bg-sky-500/20 text-sky-300',       dot: 'bg-sky-500',    label: 'Setup' },
  rehearsal: { chip: 'bg-violet-500/20 text-violet-300', dot: 'bg-violet-500', label: 'Rehearsal' },
  dismantle: { chip: 'bg-orange-500/20 text-orange-300', dot: 'bg-orange-500', label: 'Dismantle' },
}

type EntryKind = 'show' | 'setup' | 'rehearsal' | 'dismantle'

interface DayEntry {
  showId: string
  title: string
  clientName: string
  kind: EntryKind
  stage: ShowStage
  date: string
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave',
  medical: 'Medical Leave',
  emergency: 'Emergency Leave',
}

// Style for one entry: a done show greys everything; otherwise show = stage colour,
// phases = their own colour.
function entryStyle(e: DayEntry) {
  if (e.stage === 'done') return STAGE_STYLE.done
  if (e.kind === 'show') return STAGE_STYLE[e.stage] ?? STAGE_STYLE.inquiry
  return PHASE_STYLE[e.kind]
}

function entryLabel(e: DayEntry) {
  return e.kind === 'show' ? e.title : `${PHASE_STYLE[e.kind].label} · ${e.title}`
}

export function CalendarView({ shows, leaves = [], holidays = [], isManager = false }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  // Flatten every show into its dated entries: the show itself, plus setup /
  // rehearsal / dismantle when they fall on a DIFFERENT day than the show.
  const allEntries: DayEntry[] = []
  for (const s of shows) {
    if (s.show_date) {
      allEntries.push({ showId: s.id, title: s.title, clientName: s.client_name, kind: 'show', stage: s.stage, date: s.show_date })
    }
    if (s.setup_date && s.setup_date !== s.show_date) {
      allEntries.push({ showId: s.id, title: s.title, clientName: s.client_name, kind: 'setup', stage: s.stage, date: s.setup_date })
    }
    if (s.rehearsal_date && s.rehearsal_date !== s.show_date) {
      allEntries.push({ showId: s.id, title: s.title, clientName: s.client_name, kind: 'rehearsal', stage: s.stage, date: s.rehearsal_date })
    }
    if (s.teardown_date && s.teardown_date !== s.show_date) {
      allEntries.push({ showId: s.id, title: s.title, clientName: s.client_name, kind: 'dismantle', stage: s.stage, date: s.teardown_date })
    }
  }

  // Rolling window of months: 6 before → 18 after today
  const monthTabs: { year: number; month: number }[] = []
  {
    const start = new Date(today.getFullYear(), today.getMonth() - 6, 1)
    for (let i = 0; i < 25; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
      monthTabs.push({ year: d.getFullYear(), month: d.getMonth() })
    }
  }

  // Keep the selected month chip scrolled into view
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Monday-first: Mon=0 … Sun=6
  const rawFirstDay = new Date(year, month, 1).getDay()
  const firstDay = rawFirstDay === 0 ? 6 : rawFirstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dateStrFor = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const getEntriesOnDate = (day: number) => {
    const dateStr = dateStrFor(day)
    return allEntries.filter(e => e.date === dateStr)
  }
  const getHolidaysOnDate = (day: number) => {
    const dateStr = dateStrFor(day)
    return holidays.filter(h => h.date === dateStr)
  }
  const getLeavesOnDate = (day: number) => {
    const dateStr = dateStrFor(day)
    return leaves.filter(l => dateStr >= l.start_date && dateStr <= l.end_date)
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const handleDayClick = (day: number) => {
    setSelectedDate(dateStrFor(day))
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedEntries = selectedDate ? allEntries.filter(e => e.date === selectedDate) : []
  const selectedHolidays = selectedDate ? holidays.filter(h => h.date === selectedDate) : []
  const selectedLeaves = selectedDate ? leaves.filter(l => selectedDate >= l.start_date && selectedDate <= l.end_date) : []
  const hasSelection = selectedEntries.length > 0 || selectedHolidays.length > 0 || selectedLeaves.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()) }}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors font-medium"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable month tabs */}
      <div
        ref={stripRef}
        className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        {monthTabs.map(({ year: ty, month: tm }) => {
          const active = ty === year && tm === month
          const isCurrent = ty === today.getFullYear() && tm === today.getMonth()
          const showYear = tm === 0 || (monthTabs[0].year === ty && monthTabs[0].month === tm)
          return (
            <button
              key={`${ty}-${tm}`}
              ref={active ? activeTabRef : undefined}
              onClick={() => { setYear(ty); setMonth(tm) }}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                active
                  ? 'bg-[#E7191F] text-white'
                  : isCurrent
                    ? 'bg-zinc-800 text-white ring-1 ring-[#E7191F]/40'
                    : 'bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800'
              )}
            >
              {MONTHS_SHORT[tm]}{showYear ? ` ’${String(ty).slice(2)}` : ''}
            </button>
          )
        })}
      </div>

      {/* Calendar grid */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-zinc-800">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayEntries = day ? getEntriesOnDate(day) : []
            const dayHolidays = day ? getHolidaysOnDate(day) : []
            const dayLeaves = day ? getLeavesOnDate(day) : []
            const today_ = day ? isToday(day) : false
            const dateStr = day ? dateStrFor(day) : ''
            return (
              <div
                key={i}
                onClick={() => day && handleDayClick(day)}
                className={cn(
                  'min-h-[84px] p-2 border-b border-r border-zinc-800/50 transition-colors',
                  day ? 'cursor-pointer hover:bg-zinc-800/40' : '',
                  i % 7 === 6 && 'border-r-0',
                  selectedDate === dateStr && 'bg-zinc-800/60',
                )}
              >
                {day && (
                  <>
                    <span className={cn(
                      'text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full',
                      today_ ? 'bg-[#E7191F] text-white' : 'text-zinc-400'
                    )}>
                      {day}
                    </span>

                    {dayHolidays.length > 0 && (
                      <div className="text-[9px] font-semibold text-amber-400 truncate mt-0.5">
                        🎉 {dayHolidays.map(h => h.name).join(' / ')}
                      </div>
                    )}

                    <div className="mt-1 space-y-1">
                      {dayEntries.slice(0, 3).map((e, idx) => {
                        const st = entryStyle(e)
                        return (
                          <Link
                            key={`${e.showId}-${e.kind}-${idx}`}
                            href={`/dashboard/shows/${e.showId}`}
                            onClick={ev => ev.stopPropagation()}
                            className={cn(
                              'block text-[10px] font-medium px-1.5 py-0.5 rounded truncate',
                              st.chip
                            )}
                          >
                            {entryLabel(e)}
                          </Link>
                        )
                      })}
                      {dayEntries.length > 3 && (
                        <span className="text-[10px] text-zinc-600">+{dayEntries.length - 3} more</span>
                      )}
                    </div>

                    {dayLeaves.length > 0 && (
                      <div className="mt-1 text-[9px] font-medium text-teal-400 truncate">
                        🏖️ {isManager ? `${dayLeaves.length} on leave` : "You're on leave"}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {hasSelection && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
          </h3>

          {selectedHolidays.length > 0 && (
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              🎉 {selectedHolidays.map(h => h.name).join(' / ')}
            </div>
          )}

          {selectedEntries.length > 0 && (
            <div className="space-y-2">
              {selectedEntries.map((e, idx) => {
                const st = entryStyle(e)
                return (
                  <Link
                    key={`${e.showId}-${e.kind}-${idx}`}
                    href={`/dashboard/shows/${e.showId}`}
                    className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors group"
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', st.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white group-hover:text-[#E7191F] transition-colors truncate">{e.title}</div>
                      <div className="text-xs text-zinc-500">
                        {e.clientName}
                        {e.kind !== 'show' && <span className="text-zinc-400"> · {PHASE_STYLE[e.kind].label}</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {selectedLeaves.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">On Leave</p>
              {selectedLeaves.map(l => (
                <div key={l.id} className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-800/60 rounded-lg px-3 py-2">
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
                    l.status === 'approved' ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-500/10 text-teal-400 border border-dashed border-teal-500/40'
                  )}>
                    {l.status === 'approved' ? 'Approved' : 'Pending'}
                  </span>
                  <span className="truncate">
                    {isManager ? (l.profiles?.full_name ?? l.profiles?.email ?? 'Staff') : LEAVE_TYPE_LABELS[l.leave_type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-emerald-500" />
          Inquiry (soft book)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#E7191F]" />
          Confirmed
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-zinc-600" />
          Past Event
        </div>
        <span className="w-px h-3 bg-zinc-700" />
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-sky-500" />
          Setup
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-violet-500" />
          Rehearsal
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-orange-500" />
          Dismantle
        </div>
        <span className="w-px h-3 bg-zinc-700" />
        {leaves.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-teal-400" />
            On Leave
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-amber-400" />
          Public Holiday
        </div>
      </div>
    </div>
  )
}
