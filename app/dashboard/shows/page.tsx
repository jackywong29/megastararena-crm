export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PipelineBoard } from '@/components/shows/PipelineBoard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { canAddShows } from '@/lib/utils'
import type { Profile } from '@/types'

export default async function ShowsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .order('show_date', { ascending: true, nullsFirst: false })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')

  const p = profile as Profile | null
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
