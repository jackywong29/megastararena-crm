import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getClient, getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { TutorialModal } from '@/components/tutorial/TutorialModal'
import { canAddShows, canSendBroadcasts } from '@/lib/utils'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Profile + unread count are independent — fetch together. Both are cached
  // per-request, so pages re-using them cost no extra round trips.
  const [profile, unreadCount] = await Promise.all([getProfile(), getUnreadCount()])
  let p = profile

  // ── Access gate ──────────────────────────────────────────
  // Deactivated accounts are locked out immediately.
  if (p?.is_active === false) redirect('/no-access')

  // Invite-only: a non-admin must be on the allowlist. The check fails OPEN
  // if the allowed_emails table doesn't exist yet (migration not run), so it
  // never locks out existing users before schema-v5 is applied.
  if (p && p.role !== 'admin') {
    const supabase = await getClient()
    const { data: allow, error } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', p.email)
      .maybeSingle()
    if (!error && !allow) redirect('/no-access')
  }

  // First login with no profile yet: create it from the invite, else deny.
  if (!p) {
    const supabase = await getClient()
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

  const showFab = canAddShows(p)
  const isAdmin = p?.role === 'admin'
  const canBroadcast = canSendBroadcasts(p)

  return (
    <div className="flex h-full min-h-dvh bg-zinc-950">
      <div className="hidden md:flex">
        <Sidebar profile={p} unreadCount={unreadCount} />
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

      <MobileNav unreadCount={unreadCount} isAdmin={isAdmin} canBroadcast={canBroadcast} />
      <TutorialModal />
    </div>
  )
}
