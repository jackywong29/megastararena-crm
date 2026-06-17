'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, FileImage, File, Download, Trash2, Upload, Loader2, FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatFileSize, timeAgo, getInitials } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { CompanyFile, Profile } from '@/types'

interface CompanyFileListProps {
  initialFiles: CompanyFile[]
  currentProfile: Profile | null
}

function fileIcon(type: string | null) {
  if (!type) return <File className="w-4 h-4 text-zinc-600" />
  if (type.startsWith('image/')) return <FileImage className="w-4 h-4 text-violet-400" />
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-[#E7191F]" />
  return <FileText className="w-4 h-4 text-blue-400" />
}

export function CompanyFileList({ initialFiles, currentProfile }: CompanyFileListProps) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<CompanyFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const isAdmin = currentProfile?.role === 'admin'
  const canUpload = isAdmin || currentProfile?.role === 'department_head'

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('company-files')
      .upload(filePath, file)

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('company-files')
      .getPublicUrl(filePath)

    const { data } = await supabase.from('company_files').insert({
      name: file.name,
      description: description.trim() || null,
      file_url: publicUrl,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: currentProfile?.id ?? null,
    }).select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)').single()

    if (data) setFiles(f => [data as CompanyFile, ...f])

    setUploading(false)
    setDescription('')
    setShowUpload(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (cf: CompanyFile) => {
    if (!confirm(`Delete "${cf.name}"?`)) return
    const path = cf.file_url.split('/company-files/')[1]
    if (path) await supabase.storage.from('company-files').remove([path])
    await supabase.from('company_files').delete().eq('id', cf.id)
    setFiles(f => f.filter(x => x.id !== cf.id))
  }

  const canDelete = (cf: CompanyFile) =>
    isAdmin || cf.uploaded_by === currentProfile?.id

  return (
    <div className="space-y-4">
      {/* Upload section */}
      {canUpload && (
        <div>
          {!showUpload ? (
            <Button onClick={() => setShowUpload(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Upload File
            </Button>
          ) : (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Upload New File</h3>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Terms & Conditions PDF, Venue floor plan..."
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Choose File'}
                </Button>
                <Button variant="ghost" onClick={() => { setShowUpload(false); setDescription('') }}>Cancel</Button>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
          )}
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-medium">No files yet</p>
          <p className="text-zinc-700 text-xs mt-1">Upload company documents, SOPs, templates and more</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-800/50">
            {files.map(cf => (
              <div key={cf.id} className="flex items-center gap-3 px-4 py-4 hover:bg-zinc-800/30 group transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                  {fileIcon(cf.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{cf.name}</div>
                  {cf.description && (
                    <div className="text-xs text-zinc-500 mt-0.5 truncate">{cf.description}</div>
                  )}
                  <div className="text-xs text-zinc-700 mt-0.5 flex items-center gap-2">
                    {cf.file_size && <span>{formatFileSize(cf.file_size)}</span>}
                    <span>·</span>
                    <span>{timeAgo(cf.created_at)}</span>
                    {cf.profiles && (
                      <>
                        <span>·</span>
                        <span>{cf.profiles.full_name ?? cf.profiles.email}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={cf.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {canDelete(cf) && (
                    <button
                      onClick={() => handleDelete(cf)}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
