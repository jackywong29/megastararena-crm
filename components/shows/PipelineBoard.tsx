'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ShowCard } from './ShowCard'
import { STAGE_LABELS, STAGE_HEADER_COLORS, STAGE_ORDER } from '@/lib/utils'
import type { Show, Task, ShowStage } from '@/types'

interface PipelineBoardProps {
  shows: Show[]
  tasks: Task[]
}

export function PipelineBoard({ shows, tasks }: PipelineBoardProps) {
  const getShowsByStage = (stage: ShowStage) => shows.filter(s => s.stage === stage)
  const getTasksForShow = (showId: string) => tasks.filter(t => t.show_id === showId)

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-x-visible">
      <style>{`.pipeline-col { min-width: 260px; } @media (min-width: 768px) { .pipeline-col { min-width: unset; } }`}</style>
      {STAGE_ORDER.map((stage) => {
        const stageShows = getShowsByStage(stage)
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

            {/* Cards */}
            <div className="flex flex-col gap-3 flex-1">
              {stageShows.length === 0 ? (
                <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center text-zinc-700 text-xs">
                  No shows
                </div>
              ) : (
                stageShows.map(show => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    tasks={getTasksForShow(show.id)}
                  />
                ))
              )}

              {/* Add show quick link at bottom of each column */}
              <Link
                href="/dashboard/shows/new"
                className="flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add show
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
