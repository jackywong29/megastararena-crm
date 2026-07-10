import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Header } from '@/components/layout/Header'
import { NewShowForm } from '@/components/shows/NewShowForm'
import { ChevronLeft } from 'lucide-react'
import { canAddShows } from '@/lib/utils'
import type { Profile } from '@/types'

export default async function NewShowPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [profile, unreadCount] = await Promise.all([getProfile(), getUnreadCount()])

  if (!canAddShows(profile as Profile | null)) redirect('/dashboard/shows')

  return (
    <>
      <Header title="New Show" profile={profile as Profile | null} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <Link href="/dashboard/shows" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-5 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Shows
        </Link>
        <NewShowForm />
      </div>
    </>
  )
}
