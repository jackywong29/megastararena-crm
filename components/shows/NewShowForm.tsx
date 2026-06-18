'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { STAGE_SOP_TASKS } from '@/lib/utils'
import type { EventType, ShowStage, Department } from '@/types'

export function NewShowForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    client_name: '',
    client_contact: '',
    client_email: '',
    client_phone: '',
    event_type: 'concert' as EventType,
    stage: 'inquiry' as ShowStage,
    show_date: '',
    setup_time: '',
    show_time: '',
    teardown_time: '',
    expected_attendance: '',
    notes: '',
    internal_notes: '',
  })

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.client_name) {
      setError('Show title and client name are required.')
      return
    }
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error: err } = await supabase
      .from('shows')
      .insert({
        title: form.title,
        client_name: form.client_name,
        client_contact: form.client_contact || null,
        client_email: form.client_email || null,
        client_phone: form.client_phone || null,
        event_type: form.event_type,
        stage: form.stage,
        show_date: form.show_date || null,
        setup_time: form.setup_time || null,
        show_time: form.show_time || null,
        teardown_time: form.teardown_time || null,
        expected_attendance: form.expected_attendance ? parseInt(form.expected_attendance) : null,
        notes: form.notes || null,
        internal_notes: form.internal_notes || null,
        created_by: user?.id ?? null,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    if (data) {
      // Auto-create SOP tasks for the initial stage only
      const stageTasks = STAGE_SOP_TASKS[form.stage as keyof typeof STAGE_SOP_TASKS] ?? {}
      const sopInserts = Object.entries(stageTasks).flatMap(([dept, titles]) =>
        (titles as string[]).map(title => ({
          show_id: data.id,
          title,
          department: dept as Department,
          status: 'pending' as const,
          created_by: user?.id ?? null,
        }))
      )

      if (sopInserts.length > 0) {
        await supabase.from('tasks').insert(sopInserts)
      }

      await supabase.from('activity_log').insert({
        show_id: data.id,
        user_id: user?.id ?? null,
        action: 'created_show',
        details: { title: data.title },
      })
    }

    router.push(`/dashboard/shows/${data.id}`)
    router.refresh()
  }

  const sectionClass = 'bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4'
  const headingClass = 'font-semibold text-white'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Show Info */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Show Details</h2>

        <div className="space-y-1.5">
          <Label htmlFor="title">Show / Event Name *</Label>
          <Input id="title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Taylor Swift — The Eras Tour" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Event Type *</Label>
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
          <div className="space-y-1.5">
            <Label>Initial Stage</Label>
            <Select value={form.stage} onValueChange={v => set('stage', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="day_of">Show Day</SelectItem>
                <SelectItem value="done">Past Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expected_attendance">Expected Attendance</Label>
          <Input id="expected_attendance" type="number" value={form.expected_attendance} onChange={e => set('expected_attendance', e.target.value)} placeholder="e.g. 5000" />
        </div>

        <div className="bg-zinc-800/50 rounded-lg px-4 py-3 text-xs text-zinc-500 border border-zinc-700">
          SOP tasks for the initial stage will be auto-created. More tasks unlock as the show progresses through stages.
        </div>
      </div>

      {/* Client Info */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Client Information</h2>

        <div className="space-y-1.5">
          <Label htmlFor="client_name">Client / Organisation Name *</Label>
          <Input id="client_name" value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="e.g. Live Nation Malaysia" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="client_contact">Contact Person</Label>
            <Input id="client_contact" value={form.client_contact} onChange={e => set('client_contact', e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client_phone">Phone</Label>
            <Input id="client_phone" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} placeholder="+60 12 345 6789" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client_email">Email</Label>
          <Input id="client_email" type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="client@example.com" />
        </div>
      </div>

      {/* Schedule */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Schedule</h2>

        <div className="space-y-1.5">
          <Label htmlFor="show_date">Show Date</Label>
          <Input id="show_date" type="date" value={form.show_date} onChange={e => set('show_date', e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="setup_time">Setup Time</Label>
            <Input id="setup_time" type="time" value={form.setup_time} onChange={e => set('setup_time', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="show_time">Show Time</Label>
            <Input id="show_time" type="time" value={form.show_time} onChange={e => set('show_time', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teardown_time">Teardown</Label>
            <Input id="teardown_time" type="time" value={form.teardown_time} onChange={e => set('teardown_time', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={sectionClass}>
        <h2 className={headingClass}>Notes</h2>

        <div className="space-y-1.5">
          <Label htmlFor="notes">General Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes visible to all team members..." rows={3} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="internal_notes">Internal Notes</Label>
          <Textarea id="internal_notes" value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} placeholder="Internal staff notes (not shared with client)..." rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Show'}
        </Button>
      </div>
    </form>
  )
}
