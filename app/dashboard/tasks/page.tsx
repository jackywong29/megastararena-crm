import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { MyTasksList } from '@/components/tasks/MyTasksList'
import { canEditSop } from '@/lib/utils'
import type { Profile } from '@/types'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const p = profile as Profile | null

  let query = supabase
    .from('tasks')
    .select('*, shows(id, title, show_date, stage)')
    .order('created_at', { ascending: true })

  if (p?.role !== 'admin' && p?.department) {
    query = query.eq('department', p.department)
  }

  const { data: tasks } = await query

  // Sales + Admin also see open Booking SOP steps across all shows here.
  let sopItems: any[] = []
  if (canEditSop(p)) {
    const { data } = await supabase
      .from('show_checklist_items')
      .select('id, title, section, due_date, relative_due, show_id, shows(id, title, show_date, stage)')
      .eq('is_done', false)
      .eq('is_na', false)
    sopItems = data ?? []
  }

  return (
    <>
      <Header title="My Tasks" profile={p} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <MyTasksList initialTasks={(tasks ?? []) as any[]} initialSop={sopItems} profile={p} />
      </div>
    </>
  )
}
