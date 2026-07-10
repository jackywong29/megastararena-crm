import { redirect } from 'next/navigation'
import { getClient, getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Header } from '@/components/layout/Header'
import { TeamDirectory } from '@/components/team/TeamDirectory'
import type { Profile } from '@/types'

export default async function TeamPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const supabase = await getClient()

  const [profile, unreadCount, { data: profiles }] = await Promise.all([
    getProfile(),
    getUnreadCount(),
    supabase.from('profiles').select('*').order('full_name', { ascending: true }),
  ])

  const p = profile
  const people = ((profiles ?? []) as Profile[]).filter(x => x.is_active !== false)

  return (
    <>
      <Header title="Team" profile={p} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full">
        <TeamDirectory people={people} />
      </div>
    </>
  )
}
