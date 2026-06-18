'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Square, Calendar, ChevronRight } from 'lucide-react'
import { formatDate, DEPARTMENT_LABELS, DEPARTMENT_COLORS, STAGE_LABELS, STAGE_COLORS, cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface TaskWithShow {
  id: string
  title: string
  department: string
  status: string
  show_id: string
  shows: {
    id: string
    title: string
    show_date: string | null
    stage: string
  } | null
}

interface MyTasksListProps {
  initialTasks: TaskWithShow[]
  profile: Profile | null
}

export function MyTasksList({ initialTasks, profile }: MyTasksListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const supabase = createClient()

  const handleToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  }

  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')

  const groupByShow = (taskList: TaskWithShow[]) => {
    const grouped = taskList.reduce((acc, task) => {
      const key = task.show_id ?? 'unknown'
      if (!acc[key]) acc[key] = { show: task.shows, tasks: [] }
      acc[key].tasks.push(task)
      return acc
    }, {} as Record<string, { show: TaskWithShow['shows']; tasks: TaskWithShow[] }>)

    return Object.values(grouped).sort((a, b) => {
      if (!a.show?.show_date) return 1
      if (!b.show?.show_date) return -1
      return a.show.show_date.localeCompare(b.show.show_date)
    })
  }

  const deptLabel = profile?.role === 'admin'
    ? 'All Tasks'
    : (DEPARTMENT_LABELS[profile?.department as keyof typeof DEPARTMENT_LABELS] ?? 'Your Tasks')

  const TaskGroup = ({ groups }: { groups: ReturnType<typeof groupByShow> }) => (
    <div className="space-y-4">
      {groups.map(({ show, tasks: groupTasks }) => {
        const stageColor = show ? STAGE_COLORS[show.stage as keyof typeof STAGE_COLORS] : null
        return (
          <div key={show?.id ?? 'unknown'} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <Link href={show ? `/dashboard/shows/${show.id}` : '#'} className="block">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{show?.title ?? 'Unknown Show'}</div>
                  {show?.show_date && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-zinc-600" />
                      <span className="text-xs text-zinc-500">{formatDate(show.show_date)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {stageColor && show && (
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium hidden sm:inline', stageColor.bg, stageColor.text)}>
                      {STAGE_LABELS[show.stage as keyof typeof STAGE_LABELS]}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </div>
            </Link>
            <div className="divide-y divide-zinc-800/60">
              {groupTasks.map(task => {
                const dc = DEPARTMENT_COLORS[task.department as keyof typeof DEPARTMENT_COLORS]
                const isDone = task.status === 'done'
                return (
                  <button
                    key={task.id}
                    onClick={() => handleToggle(task.id, task.status)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zinc-800/30 transition-colors text-left min-h-[52px]"
                  >
                    {isDone
                      ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      : <Square className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                    }
                    <span className={cn('text-sm flex-1 leading-snug', isDone ? 'text-zinc-600 line-through' : 'text-zinc-300')}>
                      {task.title}
                    </span>
                    {dc && profile?.role === 'admin' && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 hidden sm:inline', dc.bg, dc.text)}>
                        {DEPARTMENT_LABELS[task.department as keyof typeof DEPARTMENT_LABELS]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">{deptLabel}</h2>
        <p className="text-zinc-500 text-sm mt-1">
          {pendingTasks.length} pending · {doneTasks.length} completed
        </p>
      </div>

      {pendingTasks.length === 0 && doneTasks.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <CheckSquare className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-medium">All caught up!</p>
          <p className="text-zinc-500 text-sm mt-1">No tasks assigned to your department yet.</p>
        </div>
      ) : (
        <>
          {pendingTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Pending</h3>
              <TaskGroup groups={groupByShow(pendingTasks)} />
            </div>
          )}

          {doneTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Completed</h3>
              <TaskGroup groups={groupByShow(doneTasks)} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
