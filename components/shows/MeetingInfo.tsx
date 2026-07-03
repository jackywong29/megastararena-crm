'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, canEditMeetingInfo } from '@/lib/utils'
import { MEETING_INFO_TEMPLATE } from '@/lib/meetingInfo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { MeetingInfo as MeetingInfoData, MeetingInfoExtra, Profile } from '@/types'

interface MeetingInfoProps {
  showId: string
  initial: MeetingInfoData | null
  profile: Profile | null
}

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `x-${Date.now()}-${Math.random()}`

export function MeetingInfo({ showId, initial, profile }: MeetingInfoProps) {
  const supabase = createClient()
  const router = useRouter()
  const canEdit = canEditMeetingInfo(profile)

  const [fields, setFields] = useState<Record<string, string>>(initial?.fields ?? {})
  const [extras, setExtras] = useState<MeetingInfoExtra[]>(initial?.extras ?? [])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const setField = (key: string, value: string) => {
    setFields(f => ({ ...f, [key]: value }))
    setDirty(true); setJustSaved(false)
  }

  const addExtra = () => {
    setExtras(xs => [...xs, { id: newId(), label: '', value: '' }])
    setDirty(true); setJustSaved(false)
  }
  const setExtra = (id: string, patch: Partial<MeetingInfoExtra>) => {
    setExtras(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x))
    setDirty(true); setJustSaved(false)
  }
  const removeExtra = (id: string) => {
    setExtras(xs => xs.filter(x => x.id !== id))
    setDirty(true); setJustSaved(false)
  }

  const save = async () => {
    setSaving(true)
    const payload: MeetingInfoData = {
      fields,
      extras: extras.filter(e => e.label.trim() || e.value.trim()),
    }
    await supabase.from('shows').update({
      meeting_info: payload,
      updated_at: new Date().toISOString(),
    }).eq('id', showId)
    setSaving(false); setDirty(false); setJustSaved(true)
    router.refresh()
  }

  const val = (key: string) => fields[key] ?? ''

  return (
    <div className="space-y-4 pb-20">
      {!canEdit && (
        <p className="text-xs text-zinc-600">
          View only — the Sales team maintains the meeting info for each show.
        </p>
      )}

      {MEETING_INFO_TEMPLATE.map(section => (
        <div key={section.title} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 bg-zinc-800/40 border-b border-zinc-800">
            <span className="text-sm font-semibold text-white">{section.title}</span>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            {section.fields.map(field => {
              const wide = field.multiline
              return (
                <div key={field.key} className={cn('space-y-1', wide && 'sm:col-span-2')}>
                  <label className="text-xs font-medium text-zinc-500">{field.label}</label>
                  {canEdit ? (
                    wide ? (
                      <Textarea
                        value={val(field.key)}
                        onChange={e => setField(field.key, e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    ) : (
                      <Input
                        value={val(field.key)}
                        onChange={e => setField(field.key, e.target.value)}
                        className="text-sm"
                      />
                    )
                  ) : (
                    <p className={cn('text-sm whitespace-pre-wrap', val(field.key) ? 'text-zinc-200' : 'text-zinc-600')}>
                      {val(field.key) || '—'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Additional items — per-show extras */}
      {(canEdit || extras.length > 0) && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-800/40 border-b border-zinc-800">
            <span className="text-sm font-semibold text-white">Additional Info</span>
            {canEdit && (
              <button
                onClick={addExtra}
                className="ml-auto text-xs text-[#E7191F] hover:text-red-400 font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            )}
          </div>

          <div className="p-4 space-y-3">
            {extras.length === 0 && (
              <p className="text-xs text-zinc-700 text-center py-1">
                {canEdit ? 'Add any extra details specific to this show.' : 'No additional info.'}
              </p>
            )}
            {extras.map(extra => (
              canEdit ? (
                <div key={extra.id} className="flex flex-col sm:flex-row gap-2 sm:items-start">
                  <Input
                    value={extra.label}
                    onChange={e => setExtra(extra.id, { label: e.target.value })}
                    placeholder="Label (e.g. VIP Lounge)"
                    className="sm:w-56 text-sm"
                  />
                  <Input
                    value={extra.value}
                    onChange={e => setExtra(extra.id, { value: e.target.value })}
                    placeholder="Details"
                    className="flex-1 text-sm"
                  />
                  <button
                    onClick={() => removeExtra(extra.id)}
                    className="p-2 text-zinc-700 hover:text-red-400 rounded self-start"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div key={extra.id} className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">{extra.label || 'Item'}</label>
                  <p className={cn('text-sm whitespace-pre-wrap', extra.value ? 'text-zinc-200' : 'text-zinc-600')}>
                    {extra.value || '—'}
                  </p>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Save bar */}
      {canEdit && (
        <div className="fixed bottom-4 inset-x-0 px-4 z-20 pointer-events-none">
          <div className="max-w-4xl mx-auto flex justify-end">
            <div className="pointer-events-auto flex items-center gap-3">
              {justSaved && !dirty && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              <Button onClick={save} disabled={!dirty || saving} className="gap-1.5 shadow-lg">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Meeting Info'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
