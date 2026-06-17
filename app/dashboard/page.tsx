import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PostsFeed } from '@/components/home/PostsFeed'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, CheckSquare, TrendingUp, Star, Plus } from 'lucide-react'
import { formatDate, STAGE_LABELS, STAGE_COLORS, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '@/lib/utils'
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

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: upcomingShows } = await supabase
    .from('shows')
    .select('*')
    .neq('stage', 'done')
    .not('show_date', 'is', null)
    .order('show_date', { ascending: true })
    .limit(3)

  const p = profile as Profile | null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = p?.full_name?.split(' ')[0] ?? 'there'

  return (
    <>
      <Header title="Home" profile={p} unreadCount={unreadCount ?? 0} actions={
        <Link href="/dashboard/shows/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Show</span>
          </Button>
        </Link>
      } />

      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold text-white">{greeting}, {name}</h2>
          <p className="text-zinc-500 text-sm mt-1">Here&apos;s what&apos;s happening at MegaStar Arena.</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Shows',   value: totalShows ?? 0,    icon: Star,         color: 'text-[#E7191F]',  bg: 'bg-[#E7191F]/10' },
            { label: 'Confirmed',     value: confirmedShows ?? 0, icon: CalendarDays, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
            { label: 'Inquiries',     value: inquiries ?? 0,     icon: TrendingUp,   color: 'text-amber-400',  bg: 'bg-amber-500/10' },
            { label: 'Pending Tasks', value: pendingTasks ?? 0,  icon: CheckSquare,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
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
          ))}
        </div>

        {/* Next up */}
        {upcomingShows && upcomingShows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Next Up</h3>
              <Link href="/dashboard/shows" className="text-xs text-[#E7191F] hover:text-red-400 font-medium">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingShows.map(show => {
                const stage = STAGE_COLORS[show.stage as keyof typeof STAGE_COLORS]
                const type = EVENT_TYPE_COLORS[show.event_type as keyof typeof EVENT_TYPE_COLORS]
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
          <PostsFeed initialPosts={(posts ?? []) as Post[]} currentProfile={p} />
        </div>
      </div>
    </>
  )
}
