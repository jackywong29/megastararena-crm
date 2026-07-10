export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getClient, getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Header } from '@/components/layout/Header'
import { PipelineBoard } from '@/components/shows/PipelineBoard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { canAddShows } from '@/lib/utils'

export default async function ShowsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const supabase = await getClient()

  const [profile, unreadCount, { data: shows }, { data: tasks }] = await Promise.all([
    getProfile(),
    getUnreadCount(),
    supabase.from('shows').select('*').order('show_date', { ascending: true, nullsFirst: false }),
    supabase.from('tasks').select('*'),
  ])

  const p = profile
  const allowAddShows = canAddShows(p)

  return (
    <>
      <Header
        title="Shows"
        profile={p}
        unreadCount={unreadCount ?? 0}
        actions={
          allowAddShows ? (
            <Link href="/dashboard/shows/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Show</span>
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-4 md:p-6">
        <PipelineBoard shows={shows ?? []} tasks={tasks ?? []} canAddShows={allowAddShows} />
      </div>
    </>
  )
}
