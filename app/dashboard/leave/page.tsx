import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { LeavePageClient } from '@/components/leave/LeavePageClient'
import type { Profile, LeaveApplication } from '@/types'

export default async function LeavePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const p = profile as Profile | null
  const isManager = p?.role === 'admin' || p?.can_approve_leave === true

  // Fetch current user's own leaves
  const currentYear = new Date().getFullYear()
  const { data: myLeaves } = await supabase
    .from('leave_applications')
    .select('*, profiles(*)')
    .eq('user_id', user.id)
    .gte('start_date', `${currentYear}-01-01`)
    .order('created_at', { ascending: false })

  // Managers fetch all staff leaves
  let allLeaves: LeaveApplication[] = []
  if (isManager) {
    const { data } = await supabase
      .from('leave_applications')
      .select('*, profiles(*)')
      .gte('start_date', `${currentYear}-01-01`)
      .order('created_at', { ascending: false })
    allLeaves = (data ?? []) as LeaveApplication[]
  }

  return (
    <>
      <Header title="Leave" profile={p} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <LeavePageClient
          profile={p!}
          initialLeaves={(myLeaves ?? []) as LeaveApplication[]}
          allLeaves={allLeaves}
          isManager={isManager}
        />
      </div>
    </>
  )
}
