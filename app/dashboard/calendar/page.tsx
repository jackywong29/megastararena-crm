import { redirect } from 'next/navigation'
import { getClient, getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Header } from '@/components/layout/Header'
import { CalendarView } from '@/components/calendar/CalendarView'
import type { Show, PublicHoliday } from '@/types'

export default async function CalendarPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const supabase = await getClient()

  // Leave system is currently hidden — calendar shows shows + public holidays only.
  // Shows fetch only the columns the calendar renders (skips notes/meeting_info
  // JSONB etc.) to keep the payload small.
  const [profile, unreadCount, { data: shows }, { data: holidays }] = await Promise.all([
    getProfile(),
    getUnreadCount(),
    supabase
      .from('shows')
      .select('id, title, client_name, stage, show_date, setup_date, rehearsal_date, teardown_date')
      .not('show_date', 'is', null)
      .order('show_date', { ascending: true }),
    supabase.from('public_holidays').select('*').order('date', { ascending: true }),
  ])

  const p = profile

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
