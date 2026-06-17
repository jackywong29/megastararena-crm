'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getInitials, DEPARTMENT_LABELS } from '@/lib/utils'
import { Camera, Loader2, Check } from 'lucide-react'
import type { Profile } from '@/types'

interface ProfileFormProps {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const filePath = `${profile.id}/avatar.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(publicUrl + `?t=${Date.now()}`)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ full_name: fullName || null, avatar_url: avatarUrl || null, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Avatar */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="font-semibold text-white mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-xl font-bold">
                {getInitials(fullName || null, profile.email)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#E7191F] text-white rounded-full flex items-center justify-center hover:bg-[#c41218] transition-colors shadow-lg"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div>
            <p className="text-sm text-white font-medium">{fullName || profile.email}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile.department ? DEPARTMENT_LABELS[profile.department] : 'No department'}
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs text-[#E7191F] hover:text-red-400 mt-2 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Change photo'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
      </div>

      {/* Name */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="font-semibold text-white mb-4">Display Name</h2>
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
      </div>

      {/* Read-only info */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="font-semibold text-white mb-4">Account Details</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">Email</p>
            <p className="text-sm text-zinc-300">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">Department</p>
            <p className="text-sm text-zinc-300">{profile.department ? DEPARTMENT_LABELS[profile.department] : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">Role</p>
            <p className="text-sm text-zinc-300 capitalize">{profile.role ?? '—'}</p>
          </div>
          <p className="text-xs text-zinc-700 pt-1">Department and role can only be changed by an admin.</p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saved ? (
          <><Check className="w-4 h-4" /> Saved</>
        ) : saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
        ) : (
          'Save Changes'
        )}
      </Button>
    </div>
  )
}
