'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Wrench, Mic, Star, Package, type LucideIcon } from 'lucide-react'
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

type PhaseKind = 'setup' | 'rehearsal' | 'show' | 'dismantle'
type EntryKind = PhaseKind | 'gap'

// One colour per show = its STAGE. Inquiry (soft book) green, Confirmed red,
// past/Done greyed. The show day uses the solid shade; setup / rehearsal /
// dismantle / connecting days use the soft shade of the same colour.
const STAGE_BAR: Record<string, { base: string; solid: string; dot: string; label: string }> = {
  inquiry:   { base: 'bg-emerald-500/20 text-emerald-200', solid: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', label: 'Inquiry (soft book)' },
  confirmed: { base: 'bg-[#E7191F]/20 text-red-200',       solid: 'bg-[#E7191F] text-white',   dot: 'bg-[#E7191F]',   label: 'Confirmed' },
  day_of:    { base: 'bg-emerald-500/20 text-emerald-200', solid: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', label: 'Confirmed' },
  done:      { base: 'bg-zinc-700/50 text-zinc-400',       solid: 'bg-zinc-600 text-white',    dot: 'bg-zinc-500',    label: 'Past Event' },
}

// Phases are told apart by icon + label, not by colour.
const PHASE_META: Record<PhaseKind, { label: string; Icon: LucideIcon }> = {
  setup:     { label: 'Setup',     Icon: Wrench },
  rehearsal: { label: 'Rehearsal', Icon: Mic },
  show:      { label: 'Show',      Icon: Star },
  dismantle: { label: 'Dismantle', Icon: Package },
}

interface ShowRun {
  showId: string
  title: string
  clientName: string
  stage: ShowStage
  firstDate: string
  lastDate: string
  kindByDate: Record<string, PhaseKind>
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave',
  medical: 'Medical Leave',
  emergency: 'Emergency Leave',
}

// Turn a show into one continuous run from its earliest to its latest dated
// phase. The show day always wins a date; setup/rehearsal/dismantle only get
// their own marker when they have an explicit date (a null phase date means
// "same day as the show", so it folds into the show day).
function buildRun(s: Show): ShowRun | null {
  if (!s.show_date) return null
  const kindByDate: Record<string, PhaseKind> = {}
  const mark = (d: string | null, kind: PhaseKind) => {
    if (!d) return
    if (kindByDate[d] === 'show') return
    if (kind === 'show') { kindByDate[d] = 'show'; return }
    if (!kindByDate[d]) kindByDate[d] = kind
  }
  mark(s.show_date, 'show')
  mark(s.setup_date, 'setup')
  mark(s.rehearsal_date, 'rehearsal')
  mark(s.teardown_date, 'dismantle')

  const dates = [s.show_date, s.setup_date, s.rehearsal_date, s.teardown_date].filter(Boolean) as string[]
  const firstDate = dates.reduce((a, b) => (a < b ? a : b))
  const lastDate = dates.reduce((a, b) => (a > b ? a : b))
  return { showId: s.id, title: s.title, clientName: s.client_name, stage: s.stage, firstDate, lastDate, kindByDate }
}

export function CalendarView({ shows, leaves = [], holidays = [], isManager = false }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  const runs: ShowRun[] = []
  for (const s of shows) {
    const r = buildRun(s)
    if (r) runs.push(r)
  }
  // Consistent ordering (earliest-starting first) keeps a given show in the
  // same vertical lane across the days it spans, so the bar reads continuous.
  runs.sort((a, b) => (a.firstDate === b.firstDate ? a.showId.localeCompare(b.showId) : a.firstDate.localeCompare(b.firstDate)))

  const runsOnDate = (dateStr: string) => runs.filter(r => dateStr >= r.firstDate && dateStr <= r.lastDate)

  // Rolling window of months: 6 before → 10 years after today, so shows can be
  // planned a decade out. The year dropdown jumps quickly; the strip scrolls.
  const monthTabs: { year: number; month: number }[] = []
  {
    const start = new Date(today.getFullYear(), today.getMonth() - 6, 1)
    for (let i = 0; i < 6 + 120; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
      monthTabs.push({ year: d.getFullYear(), month: d.getMonth() })
    }
  }
  const yearOptions: number[] = []
  for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 10; y++) yearOptions.push(y)

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

  const selectedRuns = selectedDate ? runsOnDate(selectedDate) : []
  const selectedHolidays = selectedDate ? holidays.filter(h => h.date === selectedDate) : []
  const selectedLeaves = selectedDate ? leaves.filter(l => selectedDate >= l.start_date && selectedDate <= l.end_date) : []
  const hasSelection = selectedRuns.length > 0 || selectedHolidays.length > 0 || selectedLeaves.length > 0

  // One day's segment of a run: full-bleed strip, rounded only on the ends of
  // the run so consecutive days visually join into one bar.
  const renderStrip = (run: ShowRun, dateStr: string, keySuffix: string) => {
    const kind = (run.kindByDate[dateStr] ?? 'gap') as EntryKind
    const isStart = dateStr === run.firstDate
    const isEnd = dateStr === run.lastDate
    const st = STAGE_BAR[run.stage] ?? STAGE_BAR.inquiry
    const isShow = kind === 'show'
    const meta = kind !== 'gap' ? PHASE_META[kind] : null
    return (
      <Link
        key={`${run.showId}-${keySuffix}`}
        href={`/dashboard/shows/${run.showId}`}
        onClick={e => e.stopPropagation()}
        title={`${run.title} — ${kind === 'gap' ? 'in progress' : PHASE_META[kind].label}`}
        className={cn(
          '-mx-2 h-[18px] px-1.5 flex items-center gap-1 text-[10px] font-medium overflow-hidden',
          isShow ? st.solid : st.base,
          isStart && 'rounded-l-md',
          isEnd && 'rounded-r-md',
        )}
      >
        {meta && <meta.Icon className="w-3 h-3 flex-shrink-0" />}
        {meta && <span className="truncate">{isShow ? run.title : meta.label}</span>}
      </Link>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-white truncate">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-zinc-800 text-white text-xs font-medium rounded-lg px-2 py-1.5 border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
            aria-label="Jump to year"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
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
            const dateStr = day ? dateStrFor(day) : ''
            const dayRuns = day ? runsOnDate(dateStr) : []
            const dayHolidays = day ? getHolidaysOnDate(day) : []
            const dayLeaves = day ? getLeavesOnDate(day) : []
            const today_ = day ? isToday(day) : false
            return (
              <div
                key={i}
                onClick={() => day && handleDayClick(day)}
                className={cn(
                  'min-h-[88px] p-2 border-b border-r border-zinc-800/50 transition-colors overflow-hidden',
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

                    <div className="mt-1 space-y-0.5">
                      {dayRuns.slice(0, 3).map((run, idx) => renderStrip(run, dateStr, `cell-${idx}`))}
                      {dayRuns.length > 3 && (
                        <span className="text-[10px] text-zinc-600">+{dayRuns.length - 3} more</span>
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

          {selectedRuns.length > 0 && (
            <div className="space-y-2">
              {selectedRuns.map(run => {
                const kind = (selectedDate ? (run.kindByDate[selectedDate] ?? 'gap') : 'gap') as EntryKind
                const st = STAGE_BAR[run.stage] ?? STAGE_BAR.inquiry
                const phaseLabel = kind === 'gap' ? 'In progress' : PHASE_META[kind].label
                return (
                  <Link
                    key={run.showId}
                    href={`/dashboard/shows/${run.showId}`}
                    className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors group"
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', st.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white group-hover:text-[#E7191F] transition-colors truncate">{run.title}</div>
                      <div className="text-xs text-zinc-500">
                        {run.clientName} · <span className="text-zinc-400">{phaseLabel}</span>
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
      <div className="space-y-2">
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
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-zinc-500" />
            Past Event
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-amber-400" />
            Public Holiday
          </div>
          {leaves.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-teal-400" />
              On Leave
            </div>
          )}
        </div>
        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
          <span className="text-[11px] text-zinc-600">Show days:</span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Wrench className="w-3 h-3" /> Setup</div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Mic className="w-3 h-3" /> Rehearsal</div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Star className="w-3 h-3" /> Show</div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Package className="w-3 h-3" /> Dismantle</div>
        </div>
      </div>
    </div>
  )
}
