import { redirect } from 'next/navigation'
import { getClient, getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Header } from '@/components/layout/Header'
import { MyTasksList } from '@/components/tasks/MyTasksList'
import { canEditSop } from '@/lib/utils'

export default async function TasksPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const supabase = await getClient()

  // The task query is scoped by the profile's department, so profile comes
  // first; everything after runs in one parallel batch.
  const [profile, unreadCount] = await Promise.all([getProfile(), getUnreadCount()])
  const p = profile

  let query = supabase
    .from('tasks')
    .select('*, shows(id, title, show_date, stage)')
    .order('created_at', { ascending: true })

  if (p?.role !== 'admin' && p?.department) {
    query = query.eq('department', p.department)
  }

  // Sales + Admin also see open Booking SOP steps across all shows here.
  const sopQuery = canEditSop(p)
    ? supabase
        .from('show_checklist_items')
        .select('id, title, section, due_date, relative_due, show_id, shows(id, title, show_date, stage)')
        .eq('is_done', false)
        .eq('is_na', false)
    : Promise.resolve({ data: null })

  const [{ data: tasks }, { data: sopData }] = await Promise.all([query, sopQuery]) as [
    { data: any[] | null }, { data: any[] | null }
  ]
  const sopItems: any[] = sopData ?? []

  return (
    <>
      <Header title="My Tasks" profile={p} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <MyTasksList initialTasks={(tasks ?? []) as any[]} initialSop={sopItems} profile={p} />
      </div>
    </>
  )
}
