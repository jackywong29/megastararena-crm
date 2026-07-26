'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Square, Calendar, ChevronRight, ListChecks, ArrowUpRight } from 'lucide-react'
import { formatDate, DEPARTMENT_LABELS, DEPARTMENT_COLORS, STAGE_LABELS, STAGE_COLORS, cn } from '@/lib/utils'
import { computeRelativeDue } from '@/lib/sop'
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

interface SopWithShow {
  id: string
  title: string
  section: string
  due_date: string | null
  relative_due: string | null
  show_id: string
  shows: {
    id: string
    title: string
    show_date: string | null
    stage: string
  } | null
}

type GroupShow = { id: string; title: string; show_date: string | null; stage: string } | null

interface MyTasksListProps {
  initialTasks: TaskWithShow[]
  initialSop?: SopWithShow[]
  profile: Profile | null
}

const todayStr = () => new Date().toISOString().slice(0, 10)

// A collapsible per-show card: header is a toggle (title, date, count, overdue
// dot, stage), with a separate corner link to open the show. Collapsed by
// default so the page reads as a clean list of shows.
function CollapsibleShowGroup({
  show, count, noun, hasOverdue = false, defaultOpen = false, children,
}: {
  show: GroupShow
  count: number
  noun: string
  hasOverdue?: boolean
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const stageColor = show ? STAGE_COLORS[show.stage as keyof typeof STAGE_COLORS] : null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-stretch">
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-zinc-800/50 transition-colors text-left"
        >
          <ChevronRight className={cn('w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform', open && 'rotate-90')} />
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
            {hasOverdue && <span className="w-2 h-2 rounded-full bg-red-500" title="Has overdue items" />}
            <span className="text-[11px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full font-medium tabular-nums">
              {count} {noun}{count !== 1 ? 's' : ''}
            </span>
            {stageColor && show && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium hidden sm:inline', stageColor.bg, stageColor.text)}>
                {STAGE_LABELS[show.stage as keyof typeof STAGE_LABELS]}
              </span>
            )}
          </div>
        </button>
        <Link
          href={show ? `/dashboard/shows/${show.id}` : '#'}
          aria-label="Open show"
          title="Open show"
          className="flex items-center px-3.5 border-l border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
      {open && (
        <div className="divide-y divide-zinc-800/60 border-t border-zinc-800">
          {children}
        </div>
      )}
    </div>
  )
}

export function MyTasksList({ initialTasks, initialSop = [], profile }: MyTasksListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [sop, setSop] = useState(initialSop)
  const supabase = createClient()

  const handleToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  }

  const handleSopDone = async (id: string) => {
    setSop(xs => xs.filter(x => x.id !== id))
    await supabase.from('show_checklist_items')
      .update({ is_done: true, done_at: new Date().toISOString() })
      .eq('id', id)
  }

  const sopSorted = [...sop].sort((a, b) => {
    const da = a.due_date ?? computeRelativeDue(a.relative_due, a.shows?.show_date ?? null)
    const db = b.due_date ?? computeRelativeDue(b.relative_due, b.shows?.show_date ?? null)
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  })

  // Group SOP steps under their show (same as the task grouping below).
  const groupSopByShow = (items: SopWithShow[]) => {
    const grouped = items.reduce((acc, item) => {
      const key = item.show_id ?? 'unknown'
      if (!acc[key]) acc[key] = { show: item.shows, items: [] }
      acc[key].items.push(item)
      return acc
    }, {} as Record<string, { show: SopWithShow['shows']; items: SopWithShow[] }>)
    return Object.values(grouped).sort((a, b) => {
      if (!a.show?.show_date) return 1
      if (!b.show?.show_date) return -1
      return a.show.show_date.localeCompare(b.show.show_date)
    })
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
    <div className="space-y-3">
      {groups.map(({ show, tasks: groupTasks }) => (
        <CollapsibleShowGroup key={show?.id ?? 'unknown'} show={show} count={groupTasks.length} noun="task">
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
        </CollapsibleShowGroup>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">{deptLabel}</h2>
        <p className="text-zinc-500 text-sm mt-1">
          {pendingTasks.length} pending · {doneTasks.length} completed
          {sop.length > 0 && ` · ${sop.length} SOP step${sop.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Booking SOP — Sales + Admin only, grouped by show */}
      {sopSorted.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            <ListChecks className="w-3.5 h-3.5" /> Booking SOP
          </h3>
          <div className="space-y-3">
            {groupSopByShow(sopSorted).map(({ show, items }) => {
              const hasOverdue = items.some(item => {
                const due = item.due_date ?? computeRelativeDue(item.relative_due, item.shows?.show_date ?? null)
                return !!due && due < todayStr()
              })
              return (
                <CollapsibleShowGroup key={show?.id ?? 'unknown'} show={show} count={items.length} noun="step" hasOverdue={hasOverdue}>
                  {items.map(item => {
                    const due = item.due_date ?? computeRelativeDue(item.relative_due, item.shows?.show_date ?? null)
                    const overdue = !!due && due < todayStr()
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                        <button
                          onClick={() => handleSopDone(item.id)}
                          className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-zinc-600 hover:border-[#E7191F] hover:bg-[#E7191F]/10 transition-all"
                          title="Mark done"
                        />
                        <span className="text-sm text-zinc-300 leading-snug flex-1 min-w-0">{item.title}</span>
                        {due && (
                          <span className={cn('text-xs flex-shrink-0', overdue ? 'text-red-400' : 'text-zinc-600')}>
                            {formatDate(due)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </CollapsibleShowGroup>
              )
            })}
          </div>
        </div>
      )}

      {pendingTasks.length === 0 && doneTasks.length === 0 && sop.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <CheckSquare className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-medium">All caught up!</p>
          <p className="text-zinc-500 text-sm mt-1">No tasks assigned to your department yet.</p>
        </div>
      ) : pendingTasks.length === 0 && doneTasks.length === 0 ? null : (
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
