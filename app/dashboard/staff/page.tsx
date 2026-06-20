import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StaffManager } from '@/components/staff/StaffManager'
import type { Profile, AllowedEmail } from '@/types'

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const p = profile as Profile | null

  // Admin only
  if (p?.role !== 'admin') redirect('/dashboard')

  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const { data: profiles } = await supabase.from('profiles').select('*').order('full_name', { ascending: true })
  const { data: allowed } = await supabase.from('allowed_emails').select('*')

  return (
    <>
      <Header title="Staff" profile={p} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">Staff & Access</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Invite staff, set their role and department, and remove access when someone leaves.
          </p>
        </div>
        <StaffManager
          profiles={(profiles ?? []) as Profile[]}
          allowed={(allowed ?? []) as AllowedEmail[]}
          currentProfile={p!}
        />
      </div>
    </>
  )
}
