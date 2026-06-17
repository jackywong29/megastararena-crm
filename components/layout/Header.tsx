'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

interface HeaderProps {
  title: string
  profile: Profile | null
  unreadCount?: number
  actions?: React.ReactNode
}

export function Header({ title, profile, unreadCount = 0, actions }: HeaderProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="bg-black border-b border-zinc-900 px-4 md:px-6 py-3 flex items-center gap-4">
      <h1 className="text-base font-semibold text-white flex-shrink-0">{title}</h1>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search shows, clients, documents..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E7191F] focus:border-transparent transition-colors"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {actions}

        {/* Mobile search icon */}
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
