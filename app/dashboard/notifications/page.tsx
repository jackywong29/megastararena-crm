import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { NotificationList } from '@/components/notifications/NotificationBell'
import type { Profile } from '@/types'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const unread = (notifications ?? []).filter(n => !n.read).length

  return (
    <>
      <Header
        title="Notifications"
        profile={profile as Profile | null}
        unreadCount={unread}
      />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <NotificationList
          initialNotifications={notifications ?? []}
          userId={user.id}
        />
      </div>
    </>
  )
}
