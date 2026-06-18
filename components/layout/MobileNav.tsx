'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Bell, CheckSquare, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard',               label: 'Home',     icon: Home },
  { href: '/dashboard/shows',         label: 'Shows',    icon: CalendarDays },
  { href: '/dashboard/calendar',      label: 'Calendar', icon: Calendar },
  { href: '/dashboard/tasks',         label: 'Tasks',    icon: CheckSquare },
  { href: '/dashboard/notifications', label: 'Alerts',   icon: Bell },
]

export function MobileNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-zinc-900 flex md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/dashboard'
          ? pathname === href
          : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-medium transition-colors relative',
              active ? 'text-[#E7191F]' : 'text-zinc-600'
            )}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {href === '/dashboard/notifications' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#E7191F] text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
