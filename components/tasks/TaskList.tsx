'use client'

import { useState } from 'react'
import { Check, Plus, Trash2, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, DEPARTMENT_LABELS, DEPARTMENT_COLORS, DEPARTMENTS, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Task, Department, Profile } from '@/types'

interface TaskListProps {
  showId: string
  initialTasks: Task[]
  profile: Profile | null
}

export function TaskList({ showId, initialTasks, profile }: TaskListProps) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [addingFor, setAddingFor] = useState<Department | null>(null)
  const [collapsed, setCollapsed] = useState<Record<Department, boolean>>({} as Record<Department, boolean>)

  const toggleStatus = async (task: Task) => {
    const next = task.status === 'done' ? 'pending' : 'done'
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: next } : t))
    await supabase.from('tasks').update({ status: next, updated_at: new Date().toISOString() }).eq('id', task.id)
  }

  const deleteTask = async (id: string) => {
    setTasks(ts => ts.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  const addTask = async (dept: Department) => {
    if (!newTaskTitle.trim()) return
    const { data: { user } } = await supabase.auth.getUser()

    const { data } = await supabase.from('tasks').insert({
      show_id: showId,
      title: newTaskTitle.trim(),
      department: dept,
      status: 'pending',
      due_date: newTaskDue || null,
      created_by: user?.id ?? null,
    }).select().single()

    if (data) {
      setTasks(ts => [...ts, data])
      setNewTaskTitle('')
      setNewTaskDue('')
      setAddingFor(null)

      await supabase.from('activity_log').insert({
        show_id: showId,
        user_id: user?.id ?? null,
        action: 'added_task',
        details: { title: data.title, department: dept },
      })
    }
  }

  return (
    <div className="space-y-3">
      {DEPARTMENTS.map((dept) => {
        const deptTasks = tasks.filter(t => t.department === dept)
        const done = deptTasks.filter(t => t.status === 'done').length
        const isCollapsed = collapsed[dept]
        const isAdding = addingFor === dept
        const color = DEPARTMENT_COLORS[dept]

        return (
          <div key={dept} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            {/* Department header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/40 border-b border-zinc-800">
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', color.bg, color.text)}>
                {DEPARTMENT_LABELS[dept]}
              </span>
              {deptTasks.length > 0 && (
                <span className="text-xs text-zinc-500">
                  {done}/{deptTasks.length} done
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setAddingFor(isAdding ? null : dept)}
                  className="text-xs text-[#E7191F] hover:text-red-400 font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add task
                </button>
                {deptTasks.length > 0 && (
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [dept]: !c[dept] }))}
                    className="text-zinc-600 hover:text-zinc-400"
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Add task form */}
            {isAdding && (
              <div className="px-4 py-3 border-b border-zinc-800 bg-[#E7191F]/5">
                <div className="flex gap-2">
                  <Input
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addTask(dept) }}
                    placeholder="Task description..."
                    className="flex-1 text-sm"
                    autoFocus
                  />
                  <Input
                    type="date"
                    value={newTaskDue}
                    onChange={e => setNewTaskDue(e.target.value)}
                    className="w-36 text-sm"
                  />
                  <Button size="sm" onClick={() => addTask(dept)}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingFor(null); setNewTaskTitle(''); }}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Task items */}
            {!isCollapsed && deptTasks.length > 0 && (
              <div className="divide-y divide-zinc-800/50">
                {deptTasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 group hover:bg-zinc-800/30 transition-colors',
                      task.status === 'done' && 'opacity-60'
                    )}
                  >
                    <button
                      onClick={() => toggleStatus(task)}
                      className={cn(
                        'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                        task.status === 'done'
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-600 hover:border-[#E7191F]'
                      )}
                    >
                      {task.status === 'done' && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        'text-sm',
                        task.status === 'done' ? 'text-zinc-600 line-through' : 'text-zinc-300'
                      )}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          <span className="text-xs text-zinc-600">Due {formatDate(task.due_date)}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isAdding && deptTasks.length === 0 && (
              <div className="px-4 py-4 text-xs text-zinc-700 text-center">
                No tasks yet — click &ldquo;Add task&rdquo; to add one
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
