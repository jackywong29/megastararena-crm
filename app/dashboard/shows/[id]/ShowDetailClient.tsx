'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { TaskList } from '@/components/tasks/TaskList'
import { DocumentList } from '@/components/documents/DocumentList'
import { SopChecklist } from '@/components/shows/SopChecklist'
import { MeetingInfo } from '@/components/shows/MeetingInfo'
import {
  formatDate, formatTime, STAGE_LABELS, STAGE_COLORS,
  timeAgo, cn, canViewInternalNotes
} from '@/lib/utils'
import { MEETING_INFO_KEYS } from '@/lib/meetingInfo'
import { FileText, CheckSquare, Info, Activity, Phone, Mail, User, Users, Clock, Calendar, Lock, ListChecks, MapPin, ClipboardList } from 'lucide-react'
import type { Show, Task, Document as Doc, Profile, ShowStage, ActivityLog, ShowChecklistItem } from '@/types'

interface ShowDetailClientProps {
  showId: string
  currentStage: ShowStage
  userId: string
  show?: Show
  tasks?: Task[]
  documents?: Doc[]
  checklist?: ShowChecklistItem[]
  activity?: any[]
  profile?: Profile | null
  tabMode?: boolean
  isStaff?: boolean
}

export function ShowDetailClient({
  showId, currentStage, userId, show, tasks = [], documents = [], checklist = [], activity = [], profile, tabMode = false, isStaff = false
}: ShowDetailClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const [stage, setStage] = useState<ShowStage>(currentStage)

  const handleStageChange = async (newStage: ShowStage) => {
    const prevStage = stage
    setStage(newStage)

    await supabase.from('shows').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', showId)
    await supabase.from('activity_log').insert({
      show_id: showId,
      user_id: userId,
      action: 'updated_stage',
      details: { from: prevStage, to: newStage },
    })

    if (newStage === 'confirmed') {
      const { data: showInfo } = await supabase.from('shows').select('title, client_name, show_date').eq('id', showId).single()
      const { data: recipients } = await supabase
        .from('profiles')
        .select('id, is_active')
        .in('role', ['admin', 'department_head'])
        .neq('id', userId)
      const activeRecipients = (recipients ?? []).filter(r => r.is_active !== false)

      if (showInfo && activeRecipients.length > 0) {
        await supabase.from('notifications').insert(
          activeRecipients.map(r => ({
            user_id: r.id,
            title: `Show confirmed: ${showInfo.title}`,
            message: `${showInfo.client_name}${showInfo.show_date ? ` · ${formatDate(showInfo.show_date)}` : ''}`,
            type: 'stage_change' as const,
            related_show_id: showId,
          }))
        )
      }
    }

    router.refresh()
  }

  const stageColor = STAGE_COLORS[stage]

  if (!tabMode) {
    if (isStaff) {
      return (
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', stageColor.bg, stageColor.text)}>
          {STAGE_LABELS[stage]}
        </span>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500 hidden sm:inline">Stage:</span>
        <Select value={stage} onValueChange={v => handleStageChange(v as ShowStage)}>
          <SelectTrigger className={cn('w-36 text-sm font-medium border-0', stageColor.bg, stageColor.text)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inquiry">🟡 Inquiry</SelectItem>
            <SelectItem value="confirmed">🔵 Confirmed</SelectItem>
            <SelectItem value="done">⚫ Past Events</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (!show) return null

  const actionLabels: Record<string, string> = {
    created_show: 'created this show',
    updated_stage: 'changed the stage',
    uploaded_document: 'uploaded a document',
    added_task: 'added a task',
  }

  const sopCounted = checklist.filter(i => !i.is_na)
  const sopDone = sopCounted.filter(i => i.is_done).length

  const mi = show.meeting_info
  const meetingFilled = mi
    ? MEETING_INFO_KEYS.filter(k => (mi.fields?.[k] ?? '').trim()).length + (mi.extras?.filter(e => e.value.trim()).length ?? 0)
    : 0

  // Surface the handful of Meeting Info fields every department needs on the
  // Overview tab. Values are free text (e.g. "8:30 PM", "TBC") — shown as-is.
  const miField = (key: string) => (mi?.fields?.[key] ?? '').trim()
  const pick = (entries: { key: string; label: string; highlight?: boolean }[]) =>
    entries
      .map(e => ({ label: e.label, value: miField(e.key), highlight: e.highlight ?? false }))
      .filter(e => e.value !== '')

  const runOfShow = pick([
    { key: 'load_in_time',  label: 'Load in' },
    { key: 'rehearsal_time', label: 'Rehearsal' },
    { key: 'door_open',     label: 'Doors open' },
    { key: 'show_start',    label: 'Show start', highlight: true },
    { key: 'show_end',      label: 'Show end' },
  ])
  const facilities = pick([
    { key: 'backdrop',           label: 'Backdrop' },
    { key: 'booth_counter_open', label: 'Booth / counter open' },
    { key: 'aircond',            label: 'Aircond' },
  ])

  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="overview"  className="gap-1.5"><Info className="w-3.5 h-3.5" />Overview</TabsTrigger>
        <TabsTrigger value="sop"       className="gap-1.5"><ListChecks className="w-3.5 h-3.5" />SOP {sopCounted.length > 0 && `(${sopDone}/${sopCounted.length})`}</TabsTrigger>
        <TabsTrigger value="meeting"   className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" />Meeting Info {meetingFilled > 0 && `(${meetingFilled})`}</TabsTrigger>
        <TabsTrigger value="documents" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Docs {documents.length > 0 && `(${documents.length})`}</TabsTrigger>
        <TabsTrigger value="tasks"     className="gap-1.5"><CheckSquare className="w-3.5 h-3.5" />Tasks {tasks.length > 0 && `(${tasks.length})`}</TabsTrigger>
        <TabsTrigger value="activity"  className="gap-1.5"><Activity className="w-3.5 h-3.5" />Activity</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Client */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-3">
            <h3 className="font-semibold text-white text-sm">Client Information</h3>
            {show.client_contact && (
              <div className="flex items-center gap-2.5 text-sm">
                <User className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-300">{show.client_contact}</span>
              </div>
            )}
            {show.client_email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <a href={`mailto:${show.client_email}`} className="text-[#E7191F] hover:text-red-400">{show.client_email}</a>
              </div>
            )}
            {show.client_phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <a href={`tel:${show.client_phone}`} className="text-[#E7191F] hover:text-red-400">{show.client_phone}</a>
              </div>
            )}
            {show.client_address && (
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300 whitespace-pre-wrap">{show.client_address}</span>
              </div>
            )}
            {!show.client_contact && !show.client_email && !show.client_phone && !show.client_address && (
              <p className="text-zinc-600 text-sm">No contact details added</p>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-3">
            <h3 className="font-semibold text-white text-sm">Schedule</h3>
            {/* Every row shares the same icon + fixed label column so the
                values line up in one clean column (they used to start at
                different x-positions depending on whether a row had a label). */}
            {show.show_date && (
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-24 flex-shrink-0">Show Date</span>
                <span className="text-zinc-300">{formatDate(show.show_date)}</span>
              </div>
            )}
            {show.show_time && (
              <div className="flex items-center gap-2.5 text-sm">
                <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-24 flex-shrink-0">Show Time</span>
                <span className="text-zinc-300">{formatTime(show.show_time)}</span>
              </div>
            )}
            {show.setup_date && show.setup_date !== show.show_date && (
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-24 flex-shrink-0">Setup</span>
                <span className="text-zinc-300">{formatDate(show.setup_date)}</span>
              </div>
            )}
            {show.rehearsal_date && show.rehearsal_date !== show.show_date && (
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-24 flex-shrink-0">Rehearsal</span>
                <span className="text-zinc-300">{formatDate(show.rehearsal_date)}</span>
              </div>
            )}
            {show.teardown_date && show.teardown_date !== show.show_date && (
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-24 flex-shrink-0">Dismantle</span>
                <span className="text-zinc-300">{formatDate(show.teardown_date)}</span>
              </div>
            )}
            {show.expected_attendance && (
              <div className="flex items-center gap-2.5 text-sm">
                <Users className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-24 flex-shrink-0">Attendance</span>
                <span className="text-zinc-300">{show.expected_attendance.toLocaleString()} expected</span>
              </div>
            )}
          </div>

          {/* Run of show — key timings + facilities pulled from Meeting Info,
              so every department sees them without opening that tab. Empty
              fields are skipped; the whole card hides if nothing is filled in. */}
          {(runOfShow.length > 0 || facilities.length > 0) && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 sm:col-span-2">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-semibold text-white text-sm">Run of Show</h3>
                <span className="text-[11px] text-zinc-600">from Meeting Info</span>
              </div>

              {runOfShow.length > 0 && (
                <div className="relative flex items-start overflow-x-auto pb-1">
                  <div className="absolute top-[7px] left-[8%] right-[8%] h-px bg-zinc-800" />
                  {runOfShow.map(({ label, value, highlight }) => (
                    <div key={label} className="relative flex-1 min-w-[84px] flex flex-col items-center gap-2 text-center px-1">
                      <span className={cn(
                        'rounded-full flex-shrink-0',
                        highlight ? 'w-3.5 h-3.5 bg-[#E7191F]' : 'w-2.5 h-2.5 bg-zinc-800 ring-2 ring-zinc-700 mt-0.5'
                      )} />
                      <span className="text-[11px] text-zinc-600 leading-tight">{label}</span>
                      <span className={cn('text-xs font-medium leading-tight', highlight ? 'text-[#E7191F]' : 'text-zinc-300')}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {facilities.length > 0 && (
                <div className={cn(
                  'grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3',
                  runOfShow.length > 0 && 'mt-5 pt-4 border-t border-zinc-800/70'
                )}>
                  {facilities.map(({ label, value }) => (
                    <div key={label} className="min-w-0">
                      <div className="text-[11px] text-zinc-600">{label}</div>
                      <div className="text-sm text-zinc-300 mt-0.5 break-words">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {show.notes && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <h3 className="font-semibold text-white text-sm mb-2">Notes</h3>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{show.notes}</p>
            </div>
          )}

          {show.internal_notes && canViewInternalNotes(profile ?? null) && (
            <div className="bg-[#E7191F]/5 rounded-xl border border-[#E7191F]/20 p-5">
              <h3 className="font-semibold text-[#E7191F] text-sm mb-2 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Internal Notes
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{show.internal_notes}</p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* SOP / Checklist */}
      <TabsContent value="sop">
        <SopChecklist
          showId={showId}
          showDate={show.show_date}
          initialItems={checklist}
          profile={profile ?? null}
          documents={documents}
        />
      </TabsContent>

      {/* Meeting Info */}
      <TabsContent value="meeting">
        <MeetingInfo
          showId={showId}
          initial={show.meeting_info ?? null}
          profile={profile ?? null}
        />
      </TabsContent>

      {/* Documents */}
      <TabsContent value="documents">
        <DocumentList showId={showId} initialDocs={documents} profile={profile ?? null} />
      </TabsContent>

      {/* Tasks */}
      <TabsContent value="tasks">
        <TaskList showId={showId} initialTasks={tasks} profile={profile ?? null} />
      </TabsContent>

      {/* Activity */}
      <TabsContent value="activity">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          {activity.length === 0 ? (
            <div className="py-10 text-center text-zinc-600 text-sm">No activity yet</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {activity.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="w-2 h-2 rounded-full bg-[#E7191F] flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <span className="font-medium text-white">
                        {log.profiles?.full_name ?? log.profiles?.email ?? 'Someone'}
                      </span>
                      {' '}{actionLabels[log.action] ?? log.action}
                      {log.details?.title && (
                        <span className="text-zinc-500"> — &ldquo;{log.details.title}&rdquo;</span>
                      )}
                      {log.details?.from && log.details?.to && (
                        <span className="text-zinc-500">
                          {' '}from <span className="font-medium text-zinc-300">{STAGE_LABELS[log.details.from as ShowStage]}</span> to <span className="font-medium text-zinc-300">{STAGE_LABELS[log.details.to as ShowStage]}</span>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{timeAgo(log.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
