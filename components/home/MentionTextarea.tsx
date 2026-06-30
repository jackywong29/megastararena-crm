'use client'

import { useRef, useState } from 'react'
import { cn, getInitials } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { MentionPerson } from '@/lib/mentions'

interface MentionTextareaProps {
  value: string
  onChange: (v: string) => void
  people: MentionPerson[]
  placeholder?: string
  rows?: number
  className?: string
  wrapperClassName?: string
  autoFocus?: boolean
  // Delegated only when the mention dropdown is closed (parent handles submit keys).
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export function MentionTextarea({
  value, onChange, people, placeholder, rows = 2, className, wrapperClassName, autoFocus, onKeyDown,
}: MentionTextareaProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [anchor, setAnchor] = useState(0)
  const [hi, setHi] = useState(0)

  const updateMention = (text: string, caret: number) => {
    const before = text.slice(0, caret)
    const at = before.lastIndexOf('@')
    if (at === -1) { setOpen(false); return }
    if (at > 0 && !/\s/.test(before[at - 1])) { setOpen(false); return }
    const frag = before.slice(at + 1)
    if (frag.length > 30 || /[\s\n]/.test(frag)) { setOpen(false); return }
    setAnchor(at); setQuery(frag); setHi(0); setOpen(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    updateMention(e.target.value, e.target.selectionStart ?? e.target.value.length)
  }

  const filtered = open
    ? people.filter(p => {
        const q = query.toLowerCase()
        return (p.full_name ?? '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
      }).slice(0, 6)
    : []

  const pick = (person: MentionPerson) => {
    const ta = taRef.current
    const caret = ta?.selectionStart ?? value.length
    const insert = '@' + (person.full_name ?? person.email) + ' '
    const newText = value.slice(0, anchor) + insert + value.slice(caret)
    onChange(newText)
    setOpen(false)
    const newCaret = anchor + insert.length
    requestAnimationFrame(() => {
      ta?.focus()
      ta?.setSelectionRange(newCaret, newCaret)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => (h + 1) % filtered.length); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHi(h => (h - 1 + filtered.length) % filtered.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(filtered[hi]); return }
      if (e.key === 'Escape')    { e.preventDefault(); setOpen(false); return }
    }
    onKeyDown?.(e)
  }

  return (
    <div className={cn('relative', wrapperClassName)}>
      <textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {filtered.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={e => { e.preventDefault(); pick(p) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                i === hi ? 'bg-zinc-700' : 'hover:bg-zinc-700/60'
              )}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-[9px] font-bold">
                  {getInitials(p.full_name, p.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-white truncate">{p.full_name ?? p.email}</span>
              <span className="text-xs text-zinc-500 truncate ml-auto">{p.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
