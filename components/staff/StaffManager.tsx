'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials, DEPARTMENT_LABELS, ROLE_LABELS, DEPARTMENTS } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { UserPlus, X, Trash2, Power, Mail, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { Profile, AllowedEmail, Department, UserRole } from '@/types'

interface StaffRow {
  email: string
  full_name: string | null
  department: Department | null
  role: UserRole | null
  avatar_url: string | null
  profileId: string | null
  status: 'active' | 'inactive' | 'invited' | 'no_access'
}

interface StaffManagerProps {
  profiles: Profile[]
  allowed: AllowedEmail[]
  currentProfile: Profile
}

const ROLE_OPTIONS: UserRole[] = ['staff', 'department_head', 'admin']

export function StaffManager({ profiles, allowed, currentProfile }: StaffManagerProps) {
  const supabase = createClient()

  const buildRows = (): StaffRow[] => {
    const allowedEmails = new Set(allowed.map(a => a.email))
    const byEmail = new Map<string, StaffRow>()
    for (const a of allowed) {
      byEmail.set(a.email, {
        email: a.email,
        full_name: a.full_name,
        department: a.department,
        role: a.role,
        avatar_url: null,
        profileId: null,
        status: 'invited',
      })
    }
    for (const pr of profiles) {
      const existing = byEmail.get(pr.email)
      // Mirrors the actual access gate in app/dashboard/layout.tsx:
      // admins always get in; everyone else needs an allowed_emails row.
      let status: StaffRow['status']
      if (pr.is_active === false) status = 'inactive'
      else if (pr.role === 'admin' || allowedEmails.has(pr.email)) status = 'active'
      else status = 'no_access' // has a profile, but missing from the allowlist — locked out
      byEmail.set(pr.email, {
        email: pr.email,
        full_name: pr.full_name ?? existing?.full_name ?? null,
        department: pr.department ?? existing?.department ?? null,
        role: pr.role ?? existing?.role ?? null,
        avatar_url: pr.avatar_url,
        profileId: pr.id,
        status,
      })
    }
    return Array.from(byEmail.values()).sort((a, b) =>
      (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)
    )
  }

  const [rows, setRows] = useState<StaffRow[]>(buildRows())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState({ email: '', full_name: '', department: 'event' as Department, role: 'staff' as UserRole })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ email: string; message: string } | null>(null)

  const updateRow = (email: string, patch: Partial<StaffRow>) =>
    setRows(rs => rs.map(r => r.email === email ? { ...r, ...patch } : r))

  const handleInvite = async () => {
    const email = invite.email.trim().toLowerCase()
    if (!email) return
    if (rows.some(r => r.email === email)) {
      setError('That email is already in the list.')
      return
    }
    setBusy('invite')
    setError(null)
    const { error } = await supabase.from('allowed_emails').insert({
      email,
      full_name: invite.full_name.trim() || null,
      department: invite.department,
      role: invite.role,
    })
    if (error) {
      setError(error.message)
      setBusy(null)
      return
    }
    const newRow: StaffRow = {
      email,
      full_name: invite.full_name.trim() || null,
      department: invite.department,
      role: invite.role,
      avatar_url: null,
      profileId: null,
      status: 'invited',
    }
    setRows(rs => [...rs, newRow].sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)))
    setInvite({ email: '', full_name: '', department: 'event', role: 'staff' })
    setInviteOpen(false)
    setBusy(null)
  }

  const handleChangeRole = async (row: StaffRow, role: UserRole) => {
    updateRow(row.email, { role })
    await supabase.from('allowed_emails').update({ role }).eq('email', row.email)
    if (row.profileId) await supabase.from('profiles').update({ role }).eq('id', row.profileId)
  }

  const handleChangeDept = async (row: StaffRow, department: Department) => {
    updateRow(row.email, { department })
    await supabase.from('allowed_emails').update({ department }).eq('email', row.email)
    if (row.profileId) await supabase.from('profiles').update({ department }).eq('id', row.profileId)
  }

  const handleToggleActive = async (row: StaffRow) => {
    if (!row.profileId) return
    const nextActive = row.status === 'inactive'
    setBusy(row.email)
    await supabase.from('profiles').update({ is_active: nextActive }).eq('id', row.profileId)
    updateRow(row.email, { status: nextActive ? 'active' : 'inactive' })
    setBusy(null)
  }

  const handleRestoreAccess = async (row: StaffRow) => {
    setBusy(row.email)
    setActionError(null)
    const { error } = await supabase.from('allowed_emails').insert({
      email: row.email,
      full_name: row.full_name,
      department: row.department,
      role: row.role,
    })
    setBusy(null)
    if (error) {
      setActionError({ email: row.email, message: error.message })
      return
    }
    updateRow(row.email, { status: 'active' })
  }

  const handleRemove = async (row: StaffRow) => {
    if (!confirm(`Remove ${row.full_name ?? row.email}? They will lose all access immediately.`)) return
    setBusy(row.email)
    await supabase.from('allowed_emails').delete().eq('email', row.email)
    if (row.profileId) await supabase.from('profiles').update({ is_active: false }).eq('id', row.profileId)
    setRows(rs => rs.filter(r => r.email !== row.email))
    setBusy(null)
  }

  const statusBadge = (status: StaffRow['status']) => {
    const map = {
      active:    { label: 'Active',    cls: 'bg-emerald-500/10 text-emerald-400' },
      inactive:  { label: 'Inactive',  cls: 'bg-red-500/10 text-red-400' },
      invited:   { label: 'Invited',   cls: 'bg-amber-500/10 text-amber-400' },
      no_access: { label: 'No Access', cls: 'bg-orange-500/10 text-orange-400' },
    }
    const s = map[status]
    return <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', s.cls)}>{s.label}</span>
  }

  return (
    <div className="space-y-5">
      {/* Header / invite trigger */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{rows.length} {rows.length === 1 ? 'person' : 'people'}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Staff
        </Button>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Invite Staff</h3>
              <button onClick={() => { setInviteOpen(false); setError(null) }} className="text-zinc-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5">
                <Mail className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  The person signs in with this Google email. Only invited emails can access the system.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Google Email *</Label>
                <Input
                  type="email"
                  value={invite.email}
                  onChange={e => setInvite(i => ({ ...i, email: e.target.value }))}
                  placeholder="name@gmail.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={invite.full_name}
                  onChange={e => setInvite(i => ({ ...i, full_name: e.target.value }))}
                  placeholder="Their full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={invite.department} onValueChange={v => setInvite(i => ({ ...i, department: v as Department }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{DEPARTMENT_LABELS[d]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={invite.role} onValueChange={v => setInvite(i => ({ ...i, role: v as UserRole }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => { setInviteOpen(false); setError(null) }} className="flex-1">Cancel</Button>
                <Button onClick={handleInvite} disabled={busy === 'invite' || !invite.email.trim()} className="flex-1">
                  {busy === 'invite' ? 'Inviting...' : 'Send Invite'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="space-y-2">
        {rows.map(row => {
          const isSelf = row.email === currentProfile.email
          return (
            <div key={row.email} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={row.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-xs font-bold">
                    {getInitials(row.full_name, row.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{row.full_name ?? row.email}</span>
                    {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3" />You</span>}
                    {statusBadge(row.status)}
                  </div>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">{row.email}</p>

                  {/* Role + department editors */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Select value={row.department ?? undefined} onValueChange={v => handleChangeDept(row, v as Department)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{DEPARTMENT_LABELS[d]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={row.role ?? undefined} onValueChange={v => handleChangeRole(row, v as UserRole)} disabled={isSelf}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {row.status === 'no_access' && (
                    <p className="text-[11px] text-orange-400/80 mt-2 leading-relaxed">
                      Has an account but isn&apos;t on the allowlist — locked out of the CRM. Restore to fix.
                    </p>
                  )}

                  {/* Actions */}
                  {!isSelf && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {row.status === 'no_access' && (
                        <button
                          onClick={() => handleRestoreAccess(row)}
                          disabled={busy === row.email}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {busy === row.email ? 'Restoring...' : 'Restore Access'}
                        </button>
                      )}
                      {row.profileId && row.status !== 'no_access' && (
                        <button
                          onClick={() => handleToggleActive(row)}
                          disabled={busy === row.email}
                          className={cn(
                            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors',
                            row.status === 'inactive'
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-amber-400 hover:bg-amber-500/10'
                          )}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {row.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(row)}
                        disabled={busy === row.email}
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  )}
                  {actionError?.email === row.email && (
                    <p className="text-red-400 text-xs mt-2">{actionError.message}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
