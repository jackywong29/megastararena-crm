import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { Profile } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  if (!profile) redirect('/login')

  return (
    <>
      <Header title="Profile" profile={profile as Profile} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6">
        <h2 className="text-lg font-bold text-white mb-6">Your Profile</h2>
        <ProfileForm profile={profile as Profile} />
      </div>
    </>
  )
}
