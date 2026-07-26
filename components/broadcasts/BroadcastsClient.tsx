'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Mail, Copy, Check, Trash2, Users, Pencil, Send } from 'lucide-react'
import { cn, DEPARTMENTS, DEPARTMENT_LABELS, USER_ROLES, ROLE_LABELS, formatDate } from '@/lib/utils'
import type { Broadcast } from '@/types'

interface StaffLite {
  id: string
  full_name: string | null
  email: string | null
  department: string | null
  role: string | null
}

interface BroadcastsClientProps {
  staff: StaffLite[]
  initialBroadcasts: Broadcast[]
  currentUserId: string
}

function audienceLabel(a: string): string {
  if (a === 'all') return 'All staff'
  if (a.startsWith('dept:')) {
    const key = a.slice(5) as keyof typeof DEPARTMENT_LABELS
    return `Department: ${DEPARTMENT_LABELS[key] ?? key}`
  }
  if (a.startsWith('role:')) {
    const key = a.slice(5)
    return `Role: ${ROLE_LABELS[key] ?? key}`
  }
  return a
}

export function BroadcastsClient({ staff, initialBroadcasts, currentUserId }: BroadcastsClientProps) {
  const supabase = createClient()
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts)

  const [audience, setAudience] = useState('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  // Only staff with a usable email can receive anything.
  const emailable = useMemo(
    () => staff.filter(s => s.email && s.email.includes('@')),
    [staff]
  )

  const recipients = useMemo(() => {
    if (audience === 'all') return emailable
    if (audience.startsWith('dept:')) return emailable.filter(s => s.department === audience.slice(5))
    if (audience.startsWith('role:')) return emailable.filter(s => s.role === audience.slice(5))
    return []
  }, [audience, emailable])

  const recipientEmails = recipients.map(r => r.email as string)

  const resetForm = () => {
    setAudience('all'); setSubject(''); setBody(''); setEditingId(null)
  }

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  // Insert a new row or update the one being edited, then sync local state.
  const persist = async (status: 'draft' | 'sent') => {
    const payload = {
      subject: subject.trim(),
      body: body.trim(),
      audience,
      recipient_count: recipients.length,
      status,
      updated_at: new Date().toISOString(),
    }
    if (editingId) {
      const { data } = await supabase.from('broadcasts').update(payload).eq('id', editingId).select().single()
      if (data) setBroadcasts(bs => bs.map(b => (b.id === editingId ? (data as Broadcast) : b)))
    } else {
      const { data } = await supabase
        .from('broadcasts')
        .insert({ ...payload, created_by: currentUserId })
        .select()
        .single()
      if (data) setBroadcasts(bs => [data as Broadcast, ...bs])
    }
  }

  const handleSaveDraft = async () => {
    if (!subject.trim() || !body.trim()) { showFlash('Add a subject and a message first.'); return }
    setBusy(true)
    await persist('draft')
    setBusy(false)
    resetForm()
    showFlash('Draft saved.')
  }

  const handleOpenInMail = async () => {
    if (!subject.trim() || !body.trim()) { showFlash('Add a subject and a message first.'); return }
    if (recipientEmails.length === 0) { showFlash('No recipients with an email for this audience.'); return }
    setBusy(true)
    await persist('sent')
    setBusy(false)
    resetForm()
    // Open the sender's own mail app with everyone BCC'd, subject + body prefilled.
    const mailto = `mailto:?bcc=${encodeURIComponent(recipientEmails.join(','))}&subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body.trim())}`
    window.location.href = mailto
    showFlash('Logged as sent — finish sending in your mail app.')
  }

  const handleCopyEmails = async () => {
    if (recipientEmails.length === 0) return
    try {
      await navigator.clipboard.writeText(recipientEmails.join(', '))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      showFlash('Could not copy — select and copy manually.')
    }
  }

  const loadForEdit = (b: Broadcast) => {
    setEditingId(b.id)
    setAudience(b.audience)
    setSubject(b.subject)
    setBody(b.body)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    setBroadcasts(bs => bs.filter(b => b.id !== id))
    if (editingId === id) resetForm()
    await supabase.from('broadcasts').delete().eq('id', id)
  }

  return (
    <div className="space-y-8">
      {/* Composer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#E7191F]" />
          <span className="font-semibold text-white text-sm">{editingId ? 'Edit broadcast' : 'New broadcast'}</span>
          {editingId && (
            <button onClick={resetForm} className="ml-auto text-xs text-zinc-500 hover:text-white">Cancel edit</button>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>To</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {DEPARTMENTS.map(d => (
                  <SelectItem key={d} value={`dept:${d}`}>Department: {DEPARTMENT_LABELS[d]}</SelectItem>
                ))}
                {USER_ROLES.map(r => (
                  <SelectItem key={r} value={`role:${r}`}>Role: {ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Users className="w-3 h-3" />
              {recipients.length} recipient{recipients.length === 1 ? '' : 's'} with an email
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="Write your announcement…" />
          </div>

          {flash && (
            <p className="text-xs text-[#E7191F] bg-[#E7191F]/10 border border-[#E7191F]/20 rounded-lg px-3 py-2">{flash}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={handleOpenInMail} disabled={busy} className="gap-1.5">
              <Send className="w-4 h-4" /> Open in mail app
            </Button>
            <Button onClick={handleSaveDraft} disabled={busy} variant="outline" className="gap-1.5">
              Save as draft
            </Button>
            <Button onClick={handleCopyEmails} disabled={recipientEmails.length === 0} variant="ghost" className="gap-1.5">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy emails'}
            </Button>
          </div>
          <p className="text-xs text-zinc-600">
            &ldquo;Open in mail app&rdquo; opens your own email with everyone in BCC and the message ready — you review and hit send. If your mail app doesn&apos;t open with many recipients, use Copy emails and paste into the BCC field.
          </p>
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">History</h3>
        {broadcasts.length === 0 ? (
          <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500 text-sm">No broadcasts yet — write the first one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {broadcasts.map(b => (
              <div key={b.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{b.subject}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
                      b.status === 'sent' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/50 text-zinc-400'
                    )}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {audienceLabel(b.audience)} · {b.recipient_count} recipient{b.recipient_count === 1 ? '' : 's'} · {formatDate(b.created_at.slice(0, 10))}
                  </p>
                </div>
                <button
                  onClick={() => loadForEdit(b)}
                  className="p-2 text-zinc-600 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  title={b.status === 'draft' ? 'Edit draft' : 'Edit / resend'}
                  aria-label="Edit broadcast"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-2 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Delete"
                  aria-label="Delete broadcast"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
