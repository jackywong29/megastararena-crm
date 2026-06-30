import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PostsFeed } from '@/components/home/PostsFeed'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, CheckSquare, TrendingUp, Star, Plus, Clock, Users, ListChecks, ArrowRight } from 'lucide-react'
import { STAGE_LABELS, STAGE_COLORS, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, canAddShows, formatDate, formatTime } from '@/lib/utils'
import { computeRelativeDue } from '@/lib/sop'
import type { MentionPerson } from '@/lib/mentions'
import type { Profile, Post } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const { count: totalShows } = await supabase.from('shows').select('*', { count: 'exact', head: true })
  const { count: confirmedShows } = await supabase.from('shows').select('*', { count: 'exact', head: true }).eq('stage', 'confirmed')
  const { count: pendingTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done')
  const { count: inquiries } = await supabase.from('shows').select('*', { count: 'exact', head: true }).eq('stage', 'inquiry')

  // Try the enriched query (reactions + comments). If those tables don't
  // exist yet (migration not run), fall back to a plain posts query so the
  // feed never breaks.
  let posts: Post[] | null = null
  const enriched = await supabase
    .from('posts')
    .select(`
      *,
      profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at),
      post_reactions(id, post_id, user_id, emoji, created_at),
      post_comments(id, post_id, user_id, content, created_at, updated_at, profiles(id, full_name, email, avatar_url))
    `)
    .order('created_at', { ascending: false })
    .limit(30)

  if (enriched.error) {
    const basic = await supabase
      .from('posts')
      .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)')
      .order('created_at', { ascending: false })
      .limit(30)
    posts = (basic.data ?? []) as Post[]
  } else {
    posts = (enriched.data ?? []) as Post[]
  }

  // Only shows dated today or later count as "upcoming" — so a past show that
  // simply hasn't been marked Done yet never sticks in the hero card. Date in
  // KL time so the cutoff flips at local midnight, not UTC.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
  const { data: upcomingShows } = await supabase
    .from('shows')
    .select('*')
    .neq('stage', 'done')
    .not('show_date', 'is', null)
    .gte('show_date', today)
    .order('show_date', { ascending: true })
    .limit(4)

  // The soonest upcoming show drives the home hero card — pull its open tasks + open SOP steps.
  const nextShow = upcomingShows?.[0] ?? null
  let nextTasks: { id: string; title: string }[] = []
  let nextSop: { id: string; title: string; due_date: string | null; relative_due: string | null }[] = []
  if (nextShow) {
    const [tRes, sRes] = await Promise.all([
      supabase.from('tasks').select('id, title').eq('show_id', nextShow.id).neq('status', 'done').limit(5),
      supabase.from('show_checklist_items').select('id, title, due_date, relative_due').eq('show_id', nextShow.id).eq('is_done', false).eq('is_na', false).order('position').limit(5),
    ])
    nextTasks = tRes.data ?? []
    nextSop = sRes.data ?? []
  }

  // Active staff for the @mention picker in the team feed.
  const { data: peopleRaw } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, department, is_active')
    .order('full_name', { ascending: true })
  const people = (peopleRaw ?? []).filter(x => x.is_active !== false) as MentionPerson[]

  const p = profile as Profile | null
  const name = p?.full_name?.split(' ')[0] ?? 'there'

  return (
    <>
      <Header title="Home" profile={p} unreadCount={unreadCount ?? 0} actions={
        canAddShows(p) ? (
          <Link href="/dashboard/shows/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Show</span>
            </Button>
          </Link>
        ) : undefined
      } />

      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold text-white">Hello, {name} 👋</h2>
          <p className="text-zinc-500 text-sm mt-1">Here&apos;s what&apos;s happening at MegaStar Arena.</p>
        </div>

        {/* Next show hero */}
        {nextShow && (() => {
          const stage = STAGE_COLORS[nextShow.stage as keyof typeof STAGE_COLORS]
          const type = EVENT_TYPE_COLORS[nextShow.event_type as keyof typeof EVENT_TYPE_COLORS]
          const d = new Date(nextShow.show_date + 'T00:00:00')
          return (
            <Link href={`/dashboard/shows/${nextShow.id}`} className="block group">
              <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/30 group-hover:border-zinc-700 transition-colors p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-semibold text-[#E7191F] uppercase tracking-wide">Next Show</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${type.bg} ${type.text}`}>{EVENT_TYPE_LABELS[nextShow.event_type as keyof typeof EVENT_TYPE_LABELS]}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stage.bg} ${stage.text}`}>{STAGE_LABELS[nextShow.stage as keyof typeof STAGE_LABELS]}</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-center bg-zinc-800/60 rounded-xl px-3 py-2 w-16">
                    <div className="text-xl font-bold text-white leading-none">{d.toLocaleDateString('en-MY', { day: '2-digit' })}</div>
                    <div className="text-[10px] text-zinc-500 uppercase mt-1">{d.toLocaleDateString('en-MY', { month: 'short' })}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate group-hover:text-[#E7191F] transition-colors">{nextShow.title}</h3>
                    <p className="text-sm text-zinc-500 truncate">{nextShow.client_name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-zinc-400">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-zinc-600" />{formatDate(nextShow.show_date)}</span>
                      {nextShow.show_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-zinc-600" />{formatTime(nextShow.show_time)}</span>}
                      {nextShow.expected_attendance && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-zinc-600" />{nextShow.expected_attendance.toLocaleString()} expected</span>}
                    </div>
                  </div>
                </div>

                {nextShow.meeting_date && (
                  <div className="mt-4 flex items-center gap-2 bg-[#E7191F]/10 border border-[#E7191F]/20 rounded-lg px-3 py-2 text-sm">
                    <Clock className="w-4 h-4 text-[#E7191F] flex-shrink-0" />
                    <span className="text-zinc-300">Next meeting: <strong className="text-white">{formatDate(nextShow.meeting_date)}{nextShow.meeting_time && ` · ${formatTime(nextShow.meeting_time)}`}</strong></span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-800/70">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                      <ListChecks className="w-3.5 h-3.5" />Booking SOP — next steps
                    </div>
                    {nextSop.length === 0 ? (
                      <p className="text-xs text-zinc-600">All steps done 🎉</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {nextSop.slice(0, 4).map(item => {
                          const due = item.due_date ?? computeRelativeDue(item.relative_due, nextShow.show_date)
                          return (
                            <li key={item.id} className="flex items-start gap-2 text-xs text-zinc-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 flex-shrink-0" />
                              <span className="flex-1 min-w-0">
                                <span className="truncate">{item.title}</span>
                                {due && <span className="text-zinc-600"> · due {formatDate(due)}</span>}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                      <CheckSquare className="w-3.5 h-3.5" />Tasks to do
                    </div>
                    {nextTasks.length === 0 ? (
                      <p className="text-xs text-zinc-600">No open tasks</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {nextTasks.slice(0, 4).map(t => (
                          <li key={t.id} className="flex items-start gap-2 text-xs text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 flex-shrink-0" />
                            <span className="flex-1 min-w-0 truncate">{t.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-medium text-[#E7191F] mt-4 group-hover:gap-2 transition-all">
                  Open show <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          )
        })()}

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Shows',   value: totalShows ?? 0,    icon: Star,         color: 'text-[#E7191F]',   bg: 'bg-[#E7191F]/10',    href: '/dashboard/shows' },
            { label: 'Confirmed',     value: confirmedShows ?? 0, icon: CalendarDays, color: 'text-blue-400',    bg: 'bg-blue-500/10',     href: '/dashboard/shows' },
            { label: 'Inquiries',     value: inquiries ?? 0,     icon: TrendingUp,   color: 'text-amber-400',   bg: 'bg-amber-500/10',    href: '/dashboard/shows' },
            { label: 'Pending Tasks', value: pendingTasks ?? 0,  icon: CheckSquare,  color: 'text-emerald-400', bg: 'bg-emerald-500/10',  href: '/dashboard/tasks' },
          ].map(({ label, value, icon: Icon, color, bg, href }) => (
            <Link key={label} href={href}>
              <Card className="hover:border-zinc-700 hover:bg-zinc-800/50 transition-all cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
                      <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Next up */}
        {upcomingShows && upcomingShows.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">More Upcoming</h3>
              <Link href="/dashboard/shows" className="text-xs text-[#E7191F] hover:text-red-400 font-medium">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingShows.slice(1).map(show => {
                const stage = STAGE_COLORS[show.stage as keyof typeof STAGE_COLORS]
                return (
                  <Link key={show.id} href={`/dashboard/shows/${show.id}`}>
                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group">
                      <div className="flex-shrink-0 w-12 text-center">
                        <div className="text-sm font-bold text-white">
                          {show.show_date ? new Date(show.show_date + 'T00:00:00').toLocaleDateString('en-MY', { day: '2-digit' }) : '—'}
                        </div>
                        <div className="text-[10px] text-zinc-600 uppercase">
                          {show.show_date ? new Date(show.show_date + 'T00:00:00').toLocaleDateString('en-MY', { month: 'short' }) : ''}
                        </div>
                      </div>
                      <div className="w-px h-8 bg-zinc-800" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white truncate group-hover:text-[#E7191F] transition-colors">{show.title}</div>
                        <div className="text-xs text-zinc-500 truncate">{show.client_name}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${stage.bg} ${stage.text}`}>
                        {STAGE_LABELS[show.stage as keyof typeof STAGE_LABELS]}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* Posts feed */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Team Updates</h3>
          <PostsFeed initialPosts={(posts ?? []) as Post[]} currentProfile={p} people={people} />
        </div>
      </div>
    </>
  )
}
