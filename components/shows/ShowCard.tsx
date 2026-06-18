import Link from 'next/link'
import { Calendar, Users, CheckSquare, AlertTriangle } from 'lucide-react'
import { cn, formatDate, STAGE_COLORS, STAGE_LABELS, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '@/lib/utils'
import type { Show, Task } from '@/types'

interface ShowCardProps {
  show: Show
  tasks?: Task[]
}

export function ShowCard({ show, tasks = [] }: ShowCardProps) {
  const stageColor = STAGE_COLORS[show.stage]
  const typeColor = EVENT_TYPE_COLORS[show.event_type]
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const totalTasks = tasks.length

  const isPastDue = show.show_date && show.stage !== 'done' &&
    new Date(show.show_date + 'T23:59:59') < new Date()

  return (
    <Link href={`/dashboard/shows/${show.id}`}>
      <div className={cn(
        'bg-zinc-900 rounded-xl border hover:bg-zinc-800/60 transition-all p-4 cursor-pointer group',
        isPastDue ? 'border-amber-500/40 hover:border-amber-500/60' : 'border-zinc-800 hover:border-zinc-700'
      )}>
        {/* Past-due warning */}
        {isPastDue && (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs mb-2.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            Date passed — update stage
          </div>
        )}
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-[#E7191F] transition-colors line-clamp-2 flex-1">
            {show.title}
          </h3>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
            typeColor.bg, typeColor.text
          )}>
            {EVENT_TYPE_LABELS[show.event_type]}
          </span>
        </div>

        <p className="text-zinc-500 text-xs mb-3">{show.client_name}</p>

        {show.show_date && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-3">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(show.show_date)}
          </div>
        )}

        <div className="flex items-center justify-between">
          {totalTasks > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <CheckSquare className="w-3.5 h-3.5" />
              <span className={doneTasks === totalTasks ? 'text-emerald-400 font-medium' : ''}>
                {doneTasks}/{totalTasks} tasks
              </span>
            </div>
          )}
          {show.expected_attendance && (
            <div className="flex items-center gap-1 text-xs text-zinc-600 ml-auto">
              <Users className="w-3 h-3" />
              {show.expected_attendance.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
