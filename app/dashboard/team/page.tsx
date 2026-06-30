import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TeamDirectory } from '@/components/team/TeamDirectory'
import type { Profile } from '@/types'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true })

  const p = profile as Profile | null
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
