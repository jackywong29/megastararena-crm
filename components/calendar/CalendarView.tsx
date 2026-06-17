'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '@/lib/utils'
import type { Show } from '@/types'

interface CalendarViewProps {
  shows: Show[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export function CalendarView({ shows }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<Show[] | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const getShowsOnDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return shows.filter(s => s.show_date === dateStr)
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const handleDayClick = (day: number, dayShows: Show[]) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setSelected(dayShows)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

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
            const dayShows = day ? getShowsOnDate(day) : []
            const today_ = day ? isToday(day) : false
            return (
              <div
                key={i}
                onClick={() => day && handleDayClick(day, dayShows)}
                className={cn(
                  'min-h-[80px] p-2 border-b border-r border-zinc-800/50 transition-colors',
                  day ? 'cursor-pointer hover:bg-zinc-800/40' : '',
                  i % 7 === 6 && 'border-r-0',
                  selectedDate === (day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '') && 'bg-zinc-800/60',
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
                    <div className="mt-1 space-y-1">
                      {dayShows.slice(0, 2).map(show => {
                        const c = EVENT_TYPE_COLORS[show.event_type]
                        return (
                          <Link
                            key={show.id}
                            href={`/dashboard/shows/${show.id}`}
                            onClick={e => e.stopPropagation()}
                            className={cn(
                              'block text-[10px] font-medium px-1.5 py-0.5 rounded truncate',
                              c.bg, c.text
                            )}
                          >
                            {show.title}
                          </Link>
                        )
                      })}
                      {dayShows.length > 2 && (
                        <span className="text-[10px] text-zinc-600">+{dayShows.length - 2} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && selected.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
          </h3>
          <div className="space-y-2">
            {selected.map(show => {
              const c = EVENT_TYPE_COLORS[show.event_type]
              return (
                <Link
                  key={show.id}
                  href={`/dashboard/shows/${show.id}`}
                  className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors group"
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.bg.replace('/20', '').replace('bg-', 'bg-'))} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white group-hover:text-[#E7191F] transition-colors truncate">{show.title}</div>
                    <div className="text-xs text-zinc-500">{show.client_name} · {EVENT_TYPE_LABELS[show.event_type]}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => {
          const c = EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS]
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={cn('w-2.5 h-2.5 rounded-full', c.bg)} />
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
