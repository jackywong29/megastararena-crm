'use client'

import { useState } from 'react'
import { Check, Plus, Trash2, Clock, Ban, MessageSquarePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, canEditSop } from '@/lib/utils'
import { CHECKLIST_SECTIONS, computeRelativeDue } from '@/lib/sop'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ShowChecklistItem, ChecklistSection, Profile } from '@/types'

interface SopChecklistProps {
  showId: string
  showDate: string | null
  initialItems: ShowChecklistItem[]
  profile: Profile | null
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export function SopChecklist({ showId, showDate, initialItems, profile }: SopChecklistProps) {
  const supabase = createClient()
  const [items, setItems] = useState<ShowChecklistItem[]>(initialItems)
  const [addingFor, setAddingFor] = useState<ChecklistSection | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  const canEdit = canEditSop(profile)

  const toggleDone = async (item: ShowChecklistItem) => {
    if (!canEdit || item.is_na) return
    const next = !item.is_done
    setItems(xs => xs.map(x => x.id === item.id ? { ...x, is_done: next } : x))
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('show_checklist_items').update({
      is_done: next,
      done_by: next ? user?.id ?? null : null,
      done_at: next ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)
  }

  const toggleNa = async (item: ShowChecklistItem) => {
    if (!canEdit) return
    const next = !item.is_na
    setItems(xs => xs.map(x => x.id === item.id ? { ...x, is_na: next, is_done: next ? false : x.is_done } : x))
    await supabase.from('show_checklist_items').update({
      is_na: next,
      is_done: next ? false : item.is_done,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)
  }

  const removeItem = async (id: string) => {
    if (!canEdit) return
    setItems(xs => xs.filter(x => x.id !== id))
    await supabase.from('show_checklist_items').delete().eq('id', id)
  }

  const addItem = async (section: ChecklistSection) => {
    if (!newTitle.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const maxPos = items.filter(i => i.section === section).reduce((m, i) => Math.max(m, i.position), -1)
    const { data } = await supabase.from('show_checklist_items').insert({
      show_id: showId,
      section,
      title: newTitle.trim(),
      position: maxPos + 1,
      allow_na: true,
      created_by: user?.id ?? null,
    }).select().single()
    if (data) {
      setItems(xs => [...xs, data as ShowChecklistItem])
      setNewTitle('')
      setAddingFor(null)
    }
  }

  const saveNote = async (item: ShowChecklistItem) => {
    const note = noteDraft.trim() || null
    setItems(xs => xs.map(x => x.id === item.id ? { ...x, note } : x))
    setNoteFor(null)
    setNoteDraft('')
    await supabase.from('show_checklist_items').update({ note, updated_at: new Date().toISOString() }).eq('id', item.id)
  }

  return (
    <div className="space-y-4">
      {CHECKLIST_SECTIONS.map(({ key, label, emoji, ordered }) => {
        const sectionItems = items
          .filter(i => i.section === key)
          .sort((a, b) => a.position - b.position)
        const counted = sectionItems.filter(i => !i.is_na)
        const done = counted.filter(i => i.is_done).length
        const isAdding = addingFor === key

        return (
          <div key={key} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-800/40 border-b border-zinc-800">
              <span className="text-base">{emoji}</span>
              <span className="text-sm font-semibold text-white">{label}</span>
              {counted.length > 0 && (
                <span className="text-xs text-zinc-500">{done}/{counted.length} done</span>
              )}
              {canEdit && (
                <button
                  onClick={() => { setAddingFor(isAdding ? null : key); setNewTitle('') }}
                  className="ml-auto text-xs text-[#E7191F] hover:text-red-400 font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add item
                </button>
              )}
            </div>

            {/* Add-item row */}
            {isAdding && (
              <div className="px-4 py-3 border-b border-zinc-800 bg-[#E7191F]/5">
                <div className="flex gap-2">
                  <Input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addItem(key) }}
                    placeholder="New checklist item..."
                    className="flex-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => addItem(key)}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingFor(null); setNewTitle('') }}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="divide-y divide-zinc-800/50">
              {sectionItems.map((item, idx) => {
                const due = item.due_date ?? computeRelativeDue(item.relative_due, showDate)
                const overdue = !!due && !item.is_done && !item.is_na && due < todayStr()
                const editingNote = noteFor === item.id

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group px-4 py-3 hover:bg-zinc-800/30 transition-colors',
                      (item.is_done || item.is_na) && 'opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Tick / N/A indicator */}
                      <button
                        onClick={() => toggleDone(item)}
                        disabled={!canEdit || item.is_na}
                        className={cn(
                          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                          item.is_na
                            ? 'border-zinc-700 bg-zinc-800 cursor-default'
                            : item.is_done
                              ? 'bg-emerald-500 border-emerald-500'
                              : canEdit
                                ? 'border-zinc-600 hover:border-[#E7191F]'
                                : 'border-zinc-800 cursor-not-allowed opacity-40'
                        )}
                      >
                        {item.is_na
                          ? <Ban className="w-3 h-3 text-zinc-500" />
                          : item.is_done && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Number (ordered sections only) */}
                      {ordered && (
                        <span className="text-xs text-zinc-600 w-4 flex-shrink-0 tabular-nums">{idx + 1}.</span>
                      )}

                      {/* Title + due */}
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          'text-sm',
                          item.is_na ? 'text-zinc-600 line-through' :
                          item.is_done ? 'text-zinc-600 line-through' : 'text-zinc-300'
                        )}>
                          {item.title}
                        </span>
                        {item.is_na && <span className="ml-2 text-[10px] uppercase tracking-wide text-zinc-600 font-semibold">N/A</span>}
                        {due && !item.is_na && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className={cn('w-3 h-3', overdue ? 'text-red-400' : 'text-zinc-600')} />
                            <span className={cn('text-xs', overdue ? 'text-red-400' : 'text-zinc-600')}>
                              Due {formatDate(due)}{item.relative_due && !item.due_date && ' (auto)'}
                            </span>
                          </div>
                        )}
                        {item.note && !editingNote && (
                          <p className="text-xs text-zinc-500 mt-1 italic whitespace-pre-wrap">{item.note}</p>
                        )}
                      </div>

                      {/* Row actions */}
                      {canEdit && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setNoteFor(item.id); setNoteDraft(item.note ?? '') }}
                            className="p-1 text-zinc-700 hover:text-zinc-300 rounded"
                            title="Add note"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleNa(item)}
                            className={cn('p-1 rounded', item.is_na ? 'text-zinc-400' : 'text-zinc-700 hover:text-zinc-300')}
                            title={item.is_na ? 'Un-mark N/A' : 'Mark not applicable'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-zinc-700 hover:text-red-400 rounded"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline note editor */}
                    {editingNote && (
                      <div className="flex gap-2 mt-2 pl-8">
                        <Input
                          value={noteDraft}
                          onChange={e => setNoteDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveNote(item) }}
                          placeholder="Add a note..."
                          className="flex-1 text-sm"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => saveNote(item)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setNoteFor(null); setNoteDraft('') }}>Cancel</Button>
                      </div>
                    )}
                  </div>
                )
              })}

              {sectionItems.length === 0 && !isAdding && (
                <div className="px-4 py-3 text-xs text-zinc-700 text-center">No items</div>
              )}
            </div>
          </div>
        )
      })}

      {!canEdit && (
        <p className="text-xs text-zinc-600 text-center pt-1">
          View only — the Sales team manages the booking SOP.
        </p>
      )}
    </div>
  )
}
