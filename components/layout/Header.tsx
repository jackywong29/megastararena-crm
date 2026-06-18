'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
import { cn, getInitials, STAGE_COLORS, STAGE_LABELS } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface HeaderProps {
  title: string
  profile: Profile | null
  unreadCount?: number
  actions?: React.ReactNode
}

export function Header({ title, profile, unreadCount = 0, actions }: HeaderProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ shows: any[]; documents: any[] }>({ shows: [], documents: [] })
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults({ shows: [], documents: [] })
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const [showRes, docRes] = await Promise.all([
        supabase
          .from('shows')
          .select('id, title, client_name, stage, show_date')
          .or(`title.ilike.%${q}%,client_name.ilike.%${q}%`)
          .order('show_date', { ascending: false })
          .limit(5),
        supabase
          .from('documents')
          .select('id, name, show_id, shows(title)')
          .ilike('name', `%${q}%`)
          .limit(4),
      ])
      setResults({ shows: showRes.data ?? [], documents: docRes.data ?? [] })
      setShowDropdown(true)
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasResults = results.shows.length > 0 || results.documents.length > 0
  const dropdownVisible = showDropdown && query.trim().length >= 2

  const clearSearch = () => {
    setQuery('')
    setShowDropdown(false)
  }

  return (
    <header className="bg-black border-b border-zinc-900 px-4 md:px-6 py-3 flex items-center gap-4">
      <h1 className="text-base font-semibold text-white flex-shrink-0">{title}</h1>

      {/* Live search bar — desktop */}
      <div className="hidden md:flex flex-1 max-w-sm relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
            placeholder="Search shows, clients, documents..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E7191F] focus:border-transparent transition-colors"
          />
        </div>

        {/* Dropdown */}
        {dropdownVisible && (
          <div
            ref={dropdownRef}
            className="absolute top-full mt-1.5 left-0 w-full min-w-[320px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {searching && (
              <div className="px-4 py-3 text-xs text-zinc-600">Searching...</div>
            )}
            {!searching && !hasResults && (
              <div className="px-4 py-3 text-xs text-zinc-500">No results for &ldquo;{query}&rdquo;</div>
            )}
            {!searching && results.shows.length > 0 && (
              <div>
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wide">Shows</div>
                {results.shows.map((show: any) => {
                  const sc = STAGE_COLORS[show.stage as keyof typeof STAGE_COLORS]
                  return (
                    <Link
                      key={show.id}
                      href={`/dashboard/shows/${show.id}`}
                      onClick={clearSearch}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{show.title}</div>
                        <div className="text-xs text-zinc-500 truncate">{show.client_name}</div>
                      </div>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', sc?.bg, sc?.text)}>
                        {STAGE_LABELS[show.stage as keyof typeof STAGE_LABELS]}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
            {!searching && results.documents.length > 0 && (
              <div className={results.shows.length > 0 ? 'border-t border-zinc-800' : ''}>
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wide">Documents</div>
                {results.documents.map((doc: any) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/shows/${doc.show_id}`}
                    onClick={clearSearch}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{doc.name}</div>
                      {doc.shows?.title && (
                        <div className="text-xs text-zinc-500 truncate">{doc.shows.title}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {actions}

        {/* Mobile search icon → dedicated search page */}
        <Link
          href="/dashboard/search"
          className="md:hidden p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <Search className="w-5 h-5" />
        </Link>

        <Link
          href="/dashboard/notifications"
          className={cn(
            'relative p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors',
            'hidden md:flex'
          )}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-[#E7191F] text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link href="/dashboard/profile" className="hidden md:flex">
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-[#E7191F] transition-all">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-xs font-semibold">
              {getInitials(profile?.full_name ?? null, profile?.email ?? '')}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
