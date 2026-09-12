'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ShowCard } from './ShowCard'
import { cn, STAGE_LABELS, STAGE_HEADER_COLORS, STAGE_ORDER } from '@/lib/utils'
import type { Show, Task, ShowStage } from '@/types'

interface PipelineBoardProps {
  shows: Show[]
  tasks: Task[]
  canAddShows?: boolean
}

interface MonthGroup {
  key: string
  label: string
  shows: Show[]
}

const UNDATED = 'undated'

// "2026-09" → "September 2026"
function monthLabel(key: string) {
  try { return format(parseISO(`${key}-01`), 'MMMM yyyy') } catch { return key }
}

// Split a column's shows into month buckets. Past Events reads newest-month
// first (the show that just finished sits at the top), while Inquiry and
// Confirmed read soonest-first. Shows with no date always collect in a final
// group so they can't silently disappear off the bottom.
function groupByMonth(list: Show[], direction: 'asc' | 'desc'): MonthGroup[] {
  const byMonth = new Map<string, Show[]>()
  const undated: Show[] = []

  for (const show of list) {
    if (!show.show_date) { undated.push(show); continue }
    const key = show.show_date.slice(0, 7)
    const bucket = byMonth.get(key)
    if (bucket) bucket.push(show)
    else byMonth.set(key, [show])
  }

  const dir = direction === 'asc' ? 1 : -1
  const groups: MonthGroup[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b) * dir)
    .map(([key, group]) => ({
      key,
      label: monthLabel(key),
      shows: [...group].sort((x, y) => (x.show_date ?? '').localeCompare(y.show_date ?? '') * dir),
    }))

  if (undated.length > 0) groups.push({ key: UNDATED, label: 'No date', shows: undated })
  return groups
}

export function PipelineBoard({ shows, tasks, canAddShows = false }: PipelineBoardProps) {
  // Explicit open/closed toggles; anything absent falls back to the default.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const getTasksForShow = (showId: string) => tasks.filter(t => t.show_id === showId)

  // Past months start collapsed so Past Events stays short as it grows — only
  // its newest month is open. The live stages start fully expanded.
  const defaultOpen = (stage: ShowStage, index: number) => stage !== 'done' || index === 0
  const isOpen = (stage: ShowStage, group: MonthGroup, index: number) =>
    overrides[`${stage}:${group.key}`] ?? defaultOpen(stage, index)

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-x-visible">
      <style>{`.pipeline-col { min-width: 260px; } @media (min-width: 768px) { .pipeline-col { min-width: unset; } }`}</style>
      {STAGE_ORDER.map((stage) => {
        const stageShows = shows.filter(s => s.stage === stage)
        const groups = groupByMonth(stageShows, stage === 'done' ? 'desc' : 'asc')

        return (
          <div key={stage} className="pipeline-col flex flex-col flex-shrink-0 md:flex-shrink">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${STAGE_HEADER_COLORS[stage]}`} />
              <span className="text-sm font-semibold text-white">{STAGE_LABELS[stage]}</span>
              <span className="ml-auto bg-zinc-800 text-zinc-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {stageShows.length}
              </span>
            </div>

            {/* Month groups */}
            <div className="flex flex-col flex-1">
              {groups.length === 0 ? (
                <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center text-zinc-700 text-xs">
                  No shows
                </div>
              ) : (
                groups.map((group, i) => {
                  const open = isOpen(stage, group, i)
                  return (
                    <div key={group.key} className="mb-3">
                      {/* Month divider — sticks to the top while scrolling a long month */}
                      <button
                        onClick={() => setOverrides(o => ({ ...o, [`${stage}:${group.key}`]: !open }))}
                        aria-expanded={open}
                        className="sticky top-0 z-10 w-full flex items-center gap-1.5 py-1.5 mb-2 bg-zinc-950/95 backdrop-blur-sm text-left group/month"
                      >
                        <ChevronRight className={cn(
                          'w-3.5 h-3.5 text-zinc-600 flex-shrink-0 transition-transform',
                          open && 'rotate-90'
                        )} />
                        <span className={cn(
                          'text-[11px] font-semibold uppercase tracking-wide transition-colors group-hover/month:text-white',
                          group.key === UNDATED ? 'text-zinc-600' : 'text-zinc-400'
                        )}>
                          {group.label}
                        </span>
                        <span className="ml-auto text-[11px] text-zinc-600 tabular-nums">{group.shows.length}</span>
                      </button>

                      {open && (
                        <div className="flex flex-col gap-3">
                          {group.shows.map(show => (
                            <ShowCard key={show.id} show={show} tasks={getTasksForShow(show.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}

              {/* Add show quick link — only for those who can create shows */}
              {canAddShows && (
                <Link
                  href="/dashboard/shows/new"
                  className="flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add show
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
