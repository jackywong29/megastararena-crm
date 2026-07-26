import { redirect } from 'next/navigation'
import { getClient, getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Header } from '@/components/layout/Header'
import { BroadcastsClient } from '@/components/broadcasts/BroadcastsClient'
import { canSendBroadcasts } from '@/lib/utils'
import type { Broadcast } from '@/types'

export default async function BroadcastsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const profile = await getProfile()
  // Admin + department heads only.
  if (!canSendBroadcasts(profile)) redirect('/dashboard')

  const supabase = await getClient()
  const [unreadCount, { data: staff }, { data: broadcasts }] = await Promise.all([
    getUnreadCount(),
    supabase
      .from('profiles')
      .select('id, full_name, email, department, role, is_active')
      .order('full_name', { ascending: true }),
    supabase.from('broadcasts').select('*').order('created_at', { ascending: false }),
  ])

  const activeStaff = (staff ?? []).filter(s => s.is_active !== false)

  return (
    <>
      <Header title="Broadcasts" profile={profile} unreadCount={unreadCount} />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">Broadcasts</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Compose an announcement to the team and send it from your own mail app. Drafts are saved here.
          </p>
        </div>
        <BroadcastsClient
          staff={activeStaff}
          initialBroadcasts={(broadcasts ?? []) as Broadcast[]}
          currentUserId={user.id}
        />
      </div>
    </>
  )
}
