'use client'

import { useState } from 'react'
import { Search, Mail } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials, DEPARTMENT_LABELS, DEPARTMENT_COLORS, ROLE_LABELS, DEPARTMENTS } from '@/lib/utils'
import type { Profile, Department } from '@/types'

export function TeamDirectory({ people }: { people: Profile[] }) {
  const [q, setQ] = useState('')

  const filtered = people.filter(p => {
    const s = q.trim().toLowerCase()
    if (!s) return true
    return (
      (p.full_name ?? '').toLowerCase().includes(s) ||
      (p.email ?? '').toLowerCase().includes(s) ||
      (p.department ? DEPARTMENT_LABELS[p.department].toLowerCase().includes(s) : false) ||
      (p.role ? (ROLE_LABELS[p.role] ?? '').toLowerCase().includes(s) : false)
    )
  })

  // Group by department, in the canonical order, with "Other" last.
  const groups: { key: string; label: string; members: Profile[] }[] = [
    ...DEPARTMENTS.map(d => ({
      key: d,
      label: DEPARTMENT_LABELS[d],
      members: filtered.filter(p => p.department === d),
    })),
    { key: 'none', label: 'Other', members: filtered.filter(p => !p.department) },
  ].filter(g => g.members.length > 0)

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, department, or role..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E7191F] focus:border-transparent"
        />
      </div>

      {groups.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center text-sm text-zinc-500">
          No one matches &ldquo;{q}&rdquo;.
        </div>
      ) : (
        groups.map(group => (
          <div key={group.key}>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              {group.label} <span className="text-zinc-700">· {group.members.length}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.members.map(person => {
                const dc = person.department ? DEPARTMENT_COLORS[person.department as Department] : null
                return (
                  <div key={person.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                    <Avatar className="h-11 w-11 flex-shrink-0">
                      <AvatarImage src={person.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-sm font-semibold">
                        {getInitials(person.full_name, person.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">
                        {person.full_name ?? person.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {dc && person.department && (
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', dc.bg, dc.text)}>
                            {DEPARTMENT_LABELS[person.department]}
                          </span>
                        )}
                        {person.role && (
                          <span className="text-[11px] text-zinc-500">{ROLE_LABELS[person.role] ?? person.role}</span>
                        )}
                      </div>
                      {person.email && (
                        <a
                          href={`mailto:${person.email}`}
                          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#E7191F] transition-colors mt-1.5 truncate"
                        >
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
