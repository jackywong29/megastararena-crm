'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Plus, X, Check, ChevronDown, Calendar, Users, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Profile, LeaveApplication, LeaveType, LeaveStatus } from '@/types'

const LEAVE_ENTITLEMENTS: Record<LeaveType, number> = {
  annual: 14,
  medical: 14,
  emergency: 3,
}

const LEAVE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual Leave',
  medical: 'Medical Leave',
  emergency: 'Emergency Leave',
}

const LEAVE_COLORS: Record<LeaveType, { bg: string; text: string; dot: string }> = {
  annual:    { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: '#38bdf8' },
  medical:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: '#34d399' },
  emergency: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: '#fbbf24' },
}

const STATUS_COLORS: Record<LeaveStatus, { bg: string; text: string }> = {
  pending:  { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400' },
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  profile: Profile
  initialLeaves: LeaveApplication[]
  allLeaves: LeaveApplication[]
  isManager: boolean
}

export function LeavePageClient({ profile, initialLeaves, allLeaves: initAllLeaves, isManager }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<'mine' | 'all'>('mine')
  const [leaves, setLeaves] = useState<LeaveApplication[]>(initialLeaves)
  const [allLeaves, setAllLeaves] = useState<LeaveApplication[]>(initAllLeaves)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type: 'annual' as LeaveType, start_date: '', end_date: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({})

  const currentYear = new Date().getFullYear()

  const usedDays = (type: LeaveType) =>
    leaves.filter(l => l.leave_type === type && l.status === 'approved' &&
      new Date(l.start_date).getFullYear() === currentYear
    ).reduce((sum, l) => sum + l.days, 0)

  const pendingDays = (type: LeaveType) =>
    leaves.filter(l => l.leave_type === type && l.status === 'pending' &&
      new Date(l.start_date).getFullYear() === currentYear
    ).reduce((sum, l) => sum + l.days, 0)

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date) return
    const days = calcDays(form.start_date, form.end_date)
    if (days <= 0) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('leave_applications')
      .insert({
        user_id: profile.id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        days,
        reason: form.reason || null,
        status: 'pending',
      })
      .select('*, profiles(*)')
      .single()

    if (data && !error) {
      setLeaves(ls => [data as LeaveApplication, ...ls])
      if (isManager) setAllLeaves(ls => [data as LeaveApplication, ...ls])
    }
    setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '' })
    setShowForm(false)
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('leave_applications').delete().eq('id', id)
    setLeaves(ls => ls.filter(l => l.id !== id))
    setAllLeaves(ls => ls.filter(l => l.id !== id))
  }

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    const note = reviewNote[id] || null
    const { data } = await supabase
      .from('leave_applications')
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString(), review_note: note, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, profiles(*)')
      .single()

    if (data) {
      setAllLeaves(ls => ls.map(l => l.id === id ? data as LeaveApplication : l))
      setLeaves(ls => ls.map(l => l.id === id ? data as LeaveApplication : l))
    }
  }

  const pendingAll = allLeaves.filter(l => l.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(LEAVE_ENTITLEMENTS) as LeaveType[]).map(type => {
          const total = LEAVE_ENTITLEMENTS[type]
          const used = usedDays(type)
          const pending = pendingDays(type)
          const remaining = total - used
          const c = LEAVE_COLORS[type]
          return (
            <div key={type} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
                <span className="text-xs text-zinc-400 font-medium">{LEAVE_LABELS[type]}</span>
              </div>
              <div className="mb-1">
                <span className="text-2xl font-bold text-white">{remaining}</span>
                <span className="text-zinc-600 text-sm ml-1">/ {total} days</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min((used / total) * 100, 100)}%`, backgroundColor: c.dot }}
                />
              </div>
              <div className="text-[10px] text-zinc-600">
                {used} used{pending > 0 ? ` · ${pending} pending` : ''}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs (managers only) */}
      {isManager && (
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('mine')}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'mine' ? 'bg-[#E7191F] text-white' : 'text-zinc-500 hover:text-white')}
          >
            My Leave
          </button>
          <button
            onClick={() => setTab('all')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'all' ? 'bg-[#E7191F] text-white' : 'text-zinc-500 hover:text-white')}
          >
            All Staff
            {pendingAll.length > 0 && (
              <span className={cn('text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center', tab === 'all' ? 'bg-white text-[#E7191F]' : 'bg-[#E7191F] text-white')}>
                {pendingAll.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Apply button */}
      {tab === 'mine' && (
        <div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Apply Leave
          </Button>
        </div>
      )}

      {/* Apply form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Apply for Leave</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="mb-1.5 block">Leave Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(LEAVE_LABELS) as LeaveType[]).map(type => {
                    const c = LEAVE_COLORS[type]
                    return (
                      <button
                        key={type}
                        onClick={() => setForm(f => ({ ...f, leave_type: type }))}
                        className={cn(
                          'py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all text-center',
                          form.leave_type === type
                            ? cn('border-current', c.bg, c.text)
                            : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
                        )}
                      >
                        {LEAVE_LABELS[type].replace(' Leave', '')}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1.5 block">End Date</Label>
                  <Input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              {form.start_date && form.end_date && calcDays(form.start_date, form.end_date) > 0 && (
                <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-800/60 px-3 py-2 rounded-lg">
                  <Calendar className="w-4 h-4 text-[#E7191F]" />
                  <span><strong className="text-white">{calcDays(form.start_date, form.end_date)}</strong> day{calcDays(form.start_date, form.end_date) !== 1 ? 's' : ''}</span>
                </div>
              )}
              <div>
                <Label className="mb-1.5 block">Reason <span className="text-zinc-600">(optional)</span></Label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Brief reason for leave..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#E7191F] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !form.start_date || !form.end_date || calcDays(form.start_date, form.end_date) <= 0}
                  className="flex-1"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Leave history */}
      {tab === 'mine' && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Your Applications — {currentYear}</h3>
          {leaves.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
              <Calendar className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No leave applications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaves.map(leave => {
                const c = LEAVE_COLORS[leave.leave_type]
                const s = STATUS_COLORS[leave.status]
                return (
                  <div key={leave.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-4">
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: c.dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white text-sm">{LEAVE_LABELS[leave.leave_type]}</span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', s.bg, s.text)}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDate(leave.start_date)} – {formatDate(leave.end_date)} · <strong className="text-zinc-400">{leave.days} day{leave.days !== 1 ? 's' : ''}</strong>
                      </p>
                      {leave.reason && <p className="text-xs text-zinc-600 mt-1 italic">{leave.reason}</p>}
                      {leave.review_note && (
                        <p className="text-xs text-zinc-500 mt-1">Note: {leave.review_note}</p>
                      )}
                    </div>
                    {leave.status === 'pending' && (
                      <button onClick={() => handleDelete(leave.id)} className="text-zinc-700 hover:text-red-400 transition-colors p-1">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Admin — All Staff view */}
      {tab === 'all' && isManager && (
        <div className="space-y-6">
          {/* Pending approvals */}
          {pendingAll.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                Pending Approval ({pendingAll.length})
              </h3>
              <div className="space-y-3">
                {pendingAll.map(leave => {
                  const c = LEAVE_COLORS[leave.leave_type]
                  const p = leave.profiles
                  return (
                    <div key={leave.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={p?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-xs font-bold">
                            {getInitials(p?.full_name ?? null, p?.email ?? '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm">{p?.full_name ?? p?.email ?? 'Unknown'}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
                            <span className="text-xs text-zinc-400">{LEAVE_LABELS[leave.leave_type]}</span>
                            <span className="text-xs text-zinc-600">·</span>
                            <span className="text-xs text-zinc-400">{leave.days} day{leave.days !== 1 ? 's' : ''}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
                          </p>
                          {leave.reason && <p className="text-xs text-zinc-600 mt-1 italic">{leave.reason}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <textarea
                          placeholder="Note (optional)..."
                          value={reviewNote[leave.id] ?? ''}
                          onChange={e => setReviewNote(n => ({ ...n, [leave.id]: e.target.value }))}
                          rows={2}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(leave.id, 'approved')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReview(leave.id, 'rejected')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All staff leave history */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">All Applications — {currentYear}</h3>
            {allLeaves.filter(l => l.status !== 'pending').length === 0 && pendingAll.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
                <Users className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No leave applications yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allLeaves.filter(l => l.status !== 'pending').map(leave => {
                  const c = LEAVE_COLORS[leave.leave_type]
                  const s = STATUS_COLORS[leave.status]
                  const p = leave.profiles
                  return (
                    <div key={leave.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src={p?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-[10px] font-bold">
                          {getInitials(p?.full_name ?? null, p?.email ?? '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-zinc-300 font-medium">{p?.full_name ?? p?.email ?? 'Unknown'}</span>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
                          <span className="text-xs text-zinc-500">{LEAVE_LABELS[leave.leave_type]}</span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold ml-auto', s.bg, s.text)}>
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {formatDate(leave.start_date)} – {formatDate(leave.end_date)} · {leave.days} day{leave.days !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
