'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, CalendarDays, CheckSquare, Calendar, MoreHorizontal, X, Bell, Heart, FolderOpen, User, LogOut, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const mainItems = [
  { href: '/dashboard',          label: 'Home',     icon: Home },
  { href: '/dashboard/shows',    label: 'Shows',    icon: CalendarDays },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/tasks',    label: 'Tasks',    icon: CheckSquare },
]

const baseMoreItems = [
  { href: '/dashboard/team',          label: 'Team',             icon: Users },
  { href: '/dashboard/notifications', label: 'Notifications',    icon: Bell },
  { href: '/dashboard/mission',       label: 'Mission & Values', icon: Heart },
  { href: '/dashboard/company',       label: 'Company Hub',      icon: FolderOpen },
  { href: '/dashboard/profile',       label: 'My Profile',       icon: User },
]

export function MobileNav({ unreadCount = 0, isAdmin = false }: { unreadCount?: number; isAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [moreOpen, setMoreOpen] = useState(false)

  const moreItems = isAdmin
    ? [...baseMoreItems, { href: '/dashboard/staff', label: 'Staff & Access', icon: Users }]
    : baseMoreItems

  const handleLogout = async () => {
    setMoreOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isMoreActive = moreItems.some(item =>
    pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-zinc-900 flex md:hidden pb-[env(safe-area-inset-bottom)]">
        {mainItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard'
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-medium transition-colors',
                active ? 'text-[#E7191F]' : 'text-zinc-600'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-medium transition-colors relative',
            isMoreActive || moreOpen ? 'text-[#E7191F]' : 'text-zinc-600'
          )}
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#E7191F] text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          More
        </button>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="relative bg-zinc-950 border-t border-zinc-800 rounded-t-2xl pb-[calc(2.5rem+env(safe-area-inset-bottom))] shadow-2xl">
            {/* Handle */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-2" />

            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
              <span className="text-sm font-semibold text-white">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1 text-zinc-600 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                const showBadge = href === '/dashboard/notifications' && unreadCount > 0
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3.5 transition-colors',
                      active ? 'text-[#E7191F]' : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm flex-1">{label}</span>
                    {showBadge && (
                      <span className="bg-[#E7191F] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}

              <div className="mx-5 border-t border-zinc-900 my-2" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
