import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Search, CalendarDays, FileText } from 'lucide-react'
import { formatDate, STAGE_COLORS, STAGE_LABELS, EVENT_TYPE_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  const query = q?.trim() ?? ''

  let shows: any[] = []
  let documents: any[] = []

  if (query.length >= 2) {
    const [showRes, docRes] = await Promise.all([
      supabase
        .from('shows')
        .select('*')
        .or(`title.ilike.%${query}%,client_name.ilike.%${query}%`)
        .order('show_date', { ascending: false })
        .limit(20),
      supabase
        .from('documents')
        .select('*, shows(title, id)')
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    shows = showRes.data ?? []
    documents = docRes.data ?? []
  }

  const totalResults = shows.length + documents.length

  return (
    <>
      <Header title="Search" profile={profile as Profile | null} unreadCount={unreadCount ?? 0} />

      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-6">
        {/* Search bar */}
        <form method="get" action="/dashboard/search">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search shows, clients, documents..."
              autoFocus
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E7191F] focus:border-transparent text-base"
            />
          </div>
        </form>

        {query.length < 2 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">
            Type at least 2 characters to search
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">
            No results found for &ldquo;{query}&rdquo;
          </div>
        ) : (
          <div className="space-y-6">
            {shows.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Shows ({shows.length})
                </h3>
                <div className="space-y-2">
                  {shows.map((show: any) => {
                    const stage = STAGE_COLORS[show.stage as keyof typeof STAGE_COLORS]
                    return (
                      <Link key={show.id} href={`/dashboard/shows/${show.id}`}>
                        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white group-hover:text-[#E7191F] transition-colors truncate">{show.title}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">
                              {show.client_name}
                              {show.show_date && <span> · {formatDate(show.show_date)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-zinc-600 hidden sm:inline">{EVENT_TYPE_LABELS[show.event_type as keyof typeof EVENT_TYPE_LABELS]}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', stage.bg, stage.text)}>
                              {STAGE_LABELS[show.stage as keyof typeof STAGE_LABELS]}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {documents.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Documents ({documents.length})
                </h3>
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <Link key={doc.id} href={`/dashboard/shows/${doc.show_id}`}>
                      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group">
                        <FileText className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white group-hover:text-[#E7191F] transition-colors truncate">{doc.name}</div>
                          {doc.shows?.title && (
                            <div className="text-xs text-zinc-500 mt-0.5">{doc.shows.title}</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
