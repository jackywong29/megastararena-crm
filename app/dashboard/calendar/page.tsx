import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CalendarView } from '@/components/calendar/CalendarView'
import type { Profile, Show, PublicHoliday } from '@/types'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .not('show_date', 'is', null)
    .order('show_date', { ascending: true })

  const p = profile as Profile | null

  // Leave system is currently hidden — calendar shows shows + public holidays only.
  const { data: holidays } = await supabase
    .from('public_holidays')
    .select('*')
    .order('date', { ascending: true })

  return (
    <>
      <Header title="Calendar" profile={p} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6">
        <CalendarView
          shows={(shows ?? []) as Show[]}
          leaves={[]}
          holidays={(holidays ?? []) as PublicHoliday[]}
        />
      </div>
    </>
  )
}
