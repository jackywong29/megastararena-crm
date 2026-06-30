import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ShowDetailClient } from './ShowDetailClient'
import { EditShowDialog } from '@/components/shows/EditShowDialog'
import {
  formatDate, formatTime, STAGE_COLORS, STAGE_LABELS,
  EVENT_TYPE_LABELS, EVENT_TYPE_COLORS
} from '@/lib/utils'
import { buildChecklistRows } from '@/lib/sop'
import { ChevronLeft, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile, Show, Task, Document, UserRole, ShowChecklistItem } from '@/types'

export default async function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const { data: show } = await supabase.from('shows').select('*').eq('id', id).single()
  if (!show) notFound()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)')
    .eq('show_id', id)
    .order('created_at', { ascending: true })

  const { data: documents } = await supabase
    .from('documents')
    .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)')
    .eq('show_id', id)
    .order('created_at', { ascending: false })

  const { data: activity } = await supabase
    .from('activity_log')
    .select('*, profiles(full_name, email)')
    .eq('show_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Booking SOP checklist — seed from the template the first time a show is opened
  let { data: checklist } = await supabase
    .from('show_checklist_items')
    .select('*')
    .eq('show_id', id)
    .order('position', { ascending: true })

  if (!checklist || checklist.length === 0) {
    await supabase.from('show_checklist_items').insert(buildChecklistRows(id, user.id))
    const seeded = await supabase
      .from('show_checklist_items')
      .select('*')
      .eq('show_id', id)
      .order('position', { ascending: true })
    checklist = seeded.data
  }

  const p = profile as Profile | null
  const s = show as Show
  const stageColor = STAGE_COLORS[s.stage]
  const typeColor = EVENT_TYPE_COLORS[s.event_type]
  const isStaff = p?.role === 'staff'

  return (
    <>
      <Header title={s.title} profile={p} unreadCount={unreadCount ?? 0} />

      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-5">
        {/* Back link */}
        <Link href="/dashboard/shows" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Shows
        </Link>

        {/* Show header */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', typeColor.bg, typeColor.text)}>
                  {EVENT_TYPE_LABELS[s.event_type]}
                </span>
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', stageColor.bg, stageColor.text)}>
                  {STAGE_LABELS[s.stage]}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white">{s.title}</h1>
              <p className="text-zinc-500 mt-1">{s.client_name}</p>
              {s.show_date && (
                <div className="flex items-center gap-1.5 text-sm text-zinc-500 mt-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(s.show_date)}
                  {s.show_time && <span>· {formatTime(s.show_time)}</span>}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isStaff && <EditShowDialog show={s} userRole={p?.role as UserRole | null} />}
              {/* Stage changer */}
              <ShowDetailClient showId={s.id} currentStage={s.stage} userId={user.id} isStaff={isStaff} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ShowDetailClient
          showId={s.id}
          currentStage={s.stage}
          userId={user.id}
          show={s}
          tasks={tasks as Task[] ?? []}
          documents={documents as Document[] ?? []}
          checklist={checklist as ShowChecklistItem[] ?? []}
          activity={activity ?? []}
          profile={p}
          isStaff={isStaff}
          tabMode
        />
      </div>
    </>
  )
}
