'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { TaskList } from '@/components/tasks/TaskList'
import { DocumentList } from '@/components/documents/DocumentList'
import {
  formatDate, formatTime, STAGE_LABELS, STAGE_COLORS,
  timeAgo, cn
} from '@/lib/utils'
import { FileText, CheckSquare, Info, Activity, Phone, Mail, User, Users, Clock, Calendar, Lock } from 'lucide-react'
import type { Show, Task, Document as Doc, Profile, ShowStage, ActivityLog } from '@/types'

interface ShowDetailClientProps {
  showId: string
  currentStage: ShowStage
  userId: string
  show?: Show
  tasks?: Task[]
  documents?: Doc[]
  activity?: any[]
  profile?: Profile | null
  tabMode?: boolean
}

export function ShowDetailClient({
  showId, currentStage, userId, show, tasks = [], documents = [], activity = [], profile, tabMode = false
}: ShowDetailClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const [stage, setStage] = useState<ShowStage>(currentStage)

  const handleStageChange = async (newStage: ShowStage) => {
    setStage(newStage)
    await supabase.from('shows').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', showId)
    await supabase.from('activity_log').insert({
      show_id: showId,
      user_id: userId,
      action: 'updated_stage',
      details: { from: stage, to: newStage },
    })
    router.refresh()
  }

  const stageColor = STAGE_COLORS[stage]

  if (!tabMode) {
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
            <SelectItem value="day_of">🟢 Show Day</SelectItem>
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

  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="overview"  className="gap-1.5"><Info className="w-3.5 h-3.5" />Overview</TabsTrigger>
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
            {!show.client_contact && !show.client_email && !show.client_phone && (
              <p className="text-zinc-600 text-sm">No contact details added</p>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-3">
            <h3 className="font-semibold text-white text-sm">Schedule</h3>
            {show.show_date && (
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-300">{formatDate(show.show_date)}</span>
              </div>
            )}
            {show.setup_time && (
              <div className="flex items-center gap-2.5 text-sm">
                <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-16">Setup</span>
                <span className="text-zinc-300">{formatTime(show.setup_time)}</span>
              </div>
            )}
            {show.show_time && (
              <div className="flex items-center gap-2.5 text-sm">
                <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-16">Show</span>
                <span className="text-zinc-300">{formatTime(show.show_time)}</span>
              </div>
            )}
            {show.teardown_time && (
              <div className="flex items-center gap-2.5 text-sm">
                <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-600 text-xs w-16">Teardown</span>
                <span className="text-zinc-300">{formatTime(show.teardown_time)}</span>
              </div>
            )}
            {show.expected_attendance && (
              <div className="flex items-center gap-2.5 text-sm">
                <Users className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-300">{show.expected_attendance.toLocaleString()} expected</span>
              </div>
            )}
          </div>

          {show.notes && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <h3 className="font-semibold text-white text-sm mb-2">Notes</h3>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{show.notes}</p>
            </div>
          )}

          {show.internal_notes && (
            <div className="bg-[#E7191F]/5 rounded-xl border border-[#E7191F]/20 p-5">
              <h3 className="font-semibold text-[#E7191F] text-sm mb-2 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Internal Notes
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{show.internal_notes}</p>
            </div>
          )}
        </div>
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
