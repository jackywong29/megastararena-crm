'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import type { Notification } from '@/types'

interface NotificationListProps {
  initialNotifications: Notification[]
  userId: string
}

export function NotificationList({ initialNotifications, userId }: NotificationListProps) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(n => [payload.new as Notification, ...n])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId])

  const markAllRead = async () => {
    setNotifications(n => n.map(x => ({ ...x, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId)
  }

  const markRead = async (id: string) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  const unread = notifications.filter(n => !n.read)

  const iconMap: Record<string, string> = {
    show_update: '📅',
    task_assigned: '✅',
    document_uploaded: '📎',
    stage_change: '🔄',
    leave_update: '🏖️',
    new_post: '📣',
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-white">Notifications</h2>
          {unread.length > 0 && (
            <span className="bg-[#E7191F] text-white text-xs rounded-full px-2 py-0.5 font-bold">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="text-xs text-[#E7191F] hover:text-red-400 font-medium transition-colors">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-12 text-center text-zinc-600 text-sm">
          No notifications yet
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-zinc-800/40 transition-colors ${!n.read ? 'bg-[#E7191F]/5' : ''}`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{iconMap[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!n.read ? 'font-semibold text-white' : 'text-zinc-400'}`}>
                    {n.title}
                  </p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[#E7191F] flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-xs text-zinc-700 mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
