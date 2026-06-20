import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { NewShowForm } from '@/components/shows/NewShowForm'
import { ChevronLeft } from 'lucide-react'
import { canAddShows } from '@/lib/utils'
import type { Profile } from '@/types'

export default async function NewShowPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

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
