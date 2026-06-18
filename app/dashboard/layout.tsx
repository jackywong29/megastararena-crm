import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { TutorialModal } from '@/components/tutorial/TutorialModal'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return (
    <div className="flex h-full min-h-screen bg-zinc-950">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile | null} unreadCount={unreadCount ?? 0} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {children}
      </main>

      <Link
        href="/dashboard/shows/new"
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-[#E7191F] text-white rounded-full flex items-center justify-center shadow-xl hover:bg-[#c41218] transition-all active:scale-95 md:bottom-6 md:right-6"
        aria-label="New Show"
      >
        <Plus className="w-6 h-6" />
      </Link>

      <MobileNav unreadCount={unreadCount ?? 0} />
      <TutorialModal />
    </div>
  )
}
