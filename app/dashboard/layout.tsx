import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { TutorialModal } from '@/components/tutorial/TutorialModal'
import { canAddShows } from '@/lib/utils'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let p = profile as Profile | null

  // ── Access gate ──────────────────────────────────────────
  // Deactivated accounts are locked out immediately.
  if (p?.is_active === false) redirect('/no-access')

  // Invite-only: a non-admin must be on the allowlist. The check fails OPEN
  // if the allowed_emails table doesn't exist yet (migration not run), so it
  // never locks out existing users before schema-v5 is applied.
  if (p && p.role !== 'admin') {
    const { data: allow, error } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', p.email)
      .maybeSingle()
    if (!error && !allow) redirect('/no-access')
  }

  // First login with no profile yet: create it from the invite, else deny.
  if (!p) {
    const { data: allow, error } = await supabase
      .from('allowed_emails')
      .select('*')
      .eq('email', user.email ?? '')
      .maybeSingle()
    if (!error) {
      if (!allow) redirect('/no-access')
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: allow.full_name,
        department: allow.department,
        role: allow.role ?? 'staff',
        is_active: true,
      })
      const { data: created } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      p = created as Profile | null
    }
  }

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  const showFab = canAddShows(p)
  const isAdmin = p?.role === 'admin'

  return (
    <div className="flex h-full min-h-dvh bg-zinc-950">
      <div className="hidden md:flex">
        <Sidebar profile={p} unreadCount={unreadCount ?? 0} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      {showFab && (
        <Link
          href="/dashboard/shows/new"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)] right-4 z-40 w-14 h-14 bg-[#E7191F] text-white rounded-full flex items-center justify-center shadow-xl hover:bg-[#c41218] transition-all active:scale-95 md:bottom-6 md:right-6"
          aria-label="New Show"
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}

      <MobileNav unreadCount={unreadCount ?? 0} isAdmin={isAdmin} />
      <TutorialModal />
    </div>
  )
}
