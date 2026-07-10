import { redirect } from 'next/navigation'
import { getClient, getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Header } from '@/components/layout/Header'
import { StaffManager } from '@/components/staff/StaffManager'
import type { Profile, AllowedEmail } from '@/types'

export default async function StaffPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const supabase = await getClient()

  const p = await getProfile()

  // Admin only
  if (p?.role !== 'admin') redirect('/dashboard')

  const [unreadCount, { data: profiles }, { data: allowed }] = await Promise.all([
    getUnreadCount(),
    supabase.from('profiles').select('*').order('full_name', { ascending: true }),
    supabase.from('allowed_emails').select('*'),
  ])

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
