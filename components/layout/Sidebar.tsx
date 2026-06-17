'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, CalendarDays, Bell, LogOut, Calendar, Heart, FolderOpen, User
} from 'lucide-react'
import { cn, getInitials, DEPARTMENT_LABELS } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { href: '/dashboard',          label: 'Home',        icon: Home },
  { href: '/dashboard/shows',    label: 'Shows',       icon: CalendarDays },
  { href: '/dashboard/calendar', label: 'Calendar',    icon: Calendar },
]

const bottomNavItems = [
  { href: '/dashboard/mission', label: 'Mission & Values', icon: Heart },
  { href: '/dashboard/company', label: 'Company Hub',      icon: FolderOpen },
]

interface SidebarProps {
  profile: Profile | null
  unreadCount?: number
}

export function Sidebar({ profile, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-black min-h-screen border-r border-zinc-900">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-900">
        <Image
          src="/logo.png"
          alt="MegaStar Arena"
          width={120}
          height={40}
          className="object-contain"
          style={{ maxHeight: 40 }}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#E7191F] text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive('/dashboard/notifications')
              ? 'bg-[#E7191F] text-white'
              : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
          )}
        >
          <Bell className="w-4 h-4 flex-shrink-0" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto bg-[#E7191F] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="border-t border-zinc-900 my-2" />

        {bottomNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#E7191F] text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-900 p-3">
        <Link href="/dashboard/profile" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-900 transition-colors group">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-xs font-semibold">
              {getInitials(profile?.full_name ?? null, profile?.email ?? '')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-zinc-200 text-xs font-medium truncate group-hover:text-white transition-colors">
              {profile?.full_name ?? profile?.email ?? 'User'}
            </div>
            <div className="text-zinc-600 text-[10px] truncate">
              {profile?.department ? DEPARTMENT_LABELS[profile.department] : 'No department'}
            </div>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-900 transition-colors text-sm mt-1"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
