'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import type { Show, EventType, ShowStage, UserRole } from '@/types'

interface EditShowDialogProps {
  show: Show
  userRole: UserRole | null
}

export function EditShowDialog({ show, userRole }: EditShowDialogProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = userRole === 'admin'

  const [form, setForm] = useState({
    title: show.title,
    client_name: show.client_name,
    client_contact: show.client_contact ?? '',
    client_email: show.client_email ?? '',
    client_phone: show.client_phone ?? '',
    event_type: show.event_type as EventType,
    stage: show.stage as ShowStage,
    show_date: show.show_date ?? '',
    setup_date: show.setup_date ?? '',
    setup_time: show.setup_time ?? '',
    rehearsal_date: show.rehearsal_date ?? '',
    rehearsal_time: show.rehearsal_time ?? '',
    show_time: show.show_time ?? '',
    teardown_date: show.teardown_date ?? '',
    teardown_time: show.teardown_time ?? '',
    expected_attendance: show.expected_attendance?.toString() ?? '',
    notes: show.notes ?? '',
    internal_notes: show.internal_notes ?? '',
  })

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.client_name) {
      setError('Show title and client name are required.')
      return
    }

    // Close dialog immediately — DB write happens in background
    setOpen(false)

    await supabase.from('shows').update({
      title: form.title,
      client_name: form.client_name,
      client_contact: form.client_contact || null,
      client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      event_type: form.event_type,
      stage: form.stage,
      show_date: form.show_date || null,
      setup_date: form.setup_date || null,
      setup_time: form.setup_time || null,
      rehearsal_date: form.rehearsal_date || null,
      rehearsal_time: form.rehearsal_time || null,
      show_time: form.show_time || null,
      teardown_date: form.teardown_date || null,
      teardown_time: form.teardown_time || null,
      expected_attendance: form.expected_attendance ? parseInt(form.expected_attendance) : null,
      notes: form.notes || null,
      internal_notes: form.internal_notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', show.id)

    router.refresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('shows').delete().eq('id', show.id)
    router.push('/dashboard/shows')
    router.refresh()
  }

  const fieldClass = 'space-y-1.5'
  const groupClass = 'bg-zinc-800/50 rounded-lg p-4 space-y-4 border border-zinc-700'

  return (
    <>
      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Show</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {error && (
              <div className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            <div className={groupClass}>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Show Details</h3>
              <div className={fieldClass}>
                <Label>Show / Event Name *</Label>
                <Input value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={fieldClass}>
                  <Label>Event Type</Label>
                  <Select value={form.event_type} onValueChange={v => set('event_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concert">Concert</SelectItem>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="private_function">Private Function</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={fieldClass}>
                  <Label>Stage</Label>
                  <Select value={form.stage} onValueChange={v => set('stage', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="done">Past Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={fieldClass}>
                <Label>Expected Attendance</Label>
                <Input type="number" value={form.expected_attendance} onChange={e => set('expected_attendance', e.target.value)} />
              </div>
            </div>

            <div className={groupClass}>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Client</h3>
              <div className={fieldClass}>
                <Label>Client / Organisation Name *</Label>
                <Input value={form.client_name} onChange={e => set('client_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={fieldClass}>
                  <Label>Contact Person</Label>
                  <Input value={form.client_contact} onChange={e => set('client_contact', e.target.value)} />
                </div>
                <div className={fieldClass}>
                  <Label>Phone</Label>
                  <Input value={form.client_phone} onChange={e => set('client_phone', e.target.value)} />
                </div>
              </div>
              <div className={fieldClass}>
                <Label>Email</Label>
                <Input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} />
              </div>
            </div>

            <div className={groupClass}>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Schedule</h3>
              <div className={fieldClass}>
                <Label>Show Date</Label>
                <Input type="date" value={form.show_date} onChange={e => set('show_date', e.target.value)} />
              </div>
              <p className="text-xs text-zinc-600">Leave a date blank if it&apos;s the same day as the show.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className={fieldClass}>
                  <Label>Setup Date</Label>
                  <Input type="date" value={form.setup_date} onChange={e => set('setup_date', e.target.value)} />
                </div>
                <div className={fieldClass}>
                  <Label>Setup Time</Label>
                  <Input type="time" value={form.setup_time} onChange={e => set('setup_time', e.target.value)} />
                </div>
                <div className={fieldClass}>
                  <Label>Rehearsal Date</Label>
                  <Input type="date" value={form.rehearsal_date} onChange={e => set('rehearsal_date', e.target.value)} />
                </div>
                <div className={fieldClass}>
                  <Label>Rehearsal Time</Label>
                  <Input type="time" value={form.rehearsal_time} onChange={e => set('rehearsal_time', e.target.value)} />
                </div>
                <div className={`${fieldClass} col-span-2`}>
                  <Label>Show Time <span className="text-zinc-600">(uses Show Date above)</span></Label>
                  <Input type="time" value={form.show_time} onChange={e => set('show_time', e.target.value)} className="max-w-[160px]" />
                </div>
                <div className={fieldClass}>
                  <Label>Dismantle Date</Label>
                  <Input type="date" value={form.teardown_date} onChange={e => set('teardown_date', e.target.value)} />
                </div>
                <div className={fieldClass}>
                  <Label>Dismantle Time</Label>
                  <Input type="time" value={form.teardown_time} onChange={e => set('teardown_time', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={groupClass}>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Notes</h3>
              <div className={fieldClass}>
                <Label>General Notes</Label>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
              </div>
              <div className={fieldClass}>
                <Label>Internal Notes</Label>
                <Textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} rows={2} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete — admin only */}
      {isAdmin && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Show</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-300 font-medium">This cannot be undone.</p>
                  <p className="text-xs text-red-400/70 mt-1">
                    Deleting <strong>&ldquo;{show.title}&rdquo;</strong> will permanently remove all associated tasks, documents, and activity logs.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Show'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
