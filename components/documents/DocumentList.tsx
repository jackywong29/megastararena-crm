'use client'

import { useState, useRef } from 'react'
import { FileText, FileImage, File, Download, Trash2, Upload, Loader2, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatFileSize, formatDate, DOC_CATEGORY_LABELS, timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { Document, DocumentCategory, Profile } from '@/types'

interface DocumentListProps {
  showId: string
  initialDocs: Document[]
  profile: Profile | null
}

function fileIcon(type: string | null) {
  if (!type) return <File className="w-4 h-4 text-zinc-600" />
  if (type.startsWith('image/')) return <FileImage className="w-4 h-4 text-violet-400" />
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-[#E7191F]" />
  return <FileText className="w-4 h-4 text-blue-400" />
}

const CATEGORIES: DocumentCategory[] = [
  'tech_rider', 'venue_spec', 'contract', 'quotation', 'invoice', 'site_visit', 'other'
]

const CATEGORY_ICONS: Record<DocumentCategory, string> = {
  tech_rider: '🎛️',
  venue_spec: '🏟️',
  contract: '📋',
  quotation: '💰',
  invoice: '🧾',
  site_visit: '🗺️',
  other: '📎',
}

export function DocumentList({ showId, initialDocs, profile }: DocumentListProps) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<Document[]>(initialDocs)
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('other')
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const filePath = `${showId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    const { data } = await supabase.from('documents').insert({
      show_id: showId,
      name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      file_type: file.type,
      category: uploadCategory,
      uploaded_by: user?.id ?? null,
    }).select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)').single()

    if (data) {
      setDocs(d => [data, ...d])
      await supabase.from('activity_log').insert({
        show_id: showId,
        user_id: user?.id ?? null,
        action: 'uploaded_document',
        details: { name: file.name, category: uploadCategory },
      })
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return
    const path = doc.file_url.split('/documents/')[1]
    if (path) await supabase.storage.from('documents').remove([path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocs(d => d.filter(x => x.id !== doc.id))
  }

  const docsByCategory = CATEGORIES
    .map(cat => ({ cat, docs: docs.filter(d => d.category === cat) }))
    .filter(({ docs }) => docs.length > 0)

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Select value={uploadCategory} onValueChange={v => setUploadCategory(v as DocumentCategory)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {DOC_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Document list grouped by category */}
      {docsByCategory.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-medium">No documents yet</p>
          <p className="text-zinc-700 text-xs mt-1">Upload tech riders, contracts, quotations, and more</p>
        </div>
      ) : (
        docsByCategory.map(({ cat, docs: catDocs }) => (
          <div key={cat} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/40 border-b border-zinc-800">
              <span className="text-base">{CATEGORY_ICONS[cat]}</span>
              <span className="text-sm font-semibold text-white">{DOC_CATEGORY_LABELS[cat]}</span>
              <span className="ml-auto text-xs text-zinc-600">{catDocs.length} file{catDocs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {catDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 group transition-colors">
                  <div className="flex-shrink-0">{fileIcon(doc.file_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-300 truncate">{doc.name}</div>
                    <div className="text-xs text-zinc-600 mt-0.5 flex items-center gap-2">
                      {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                      <span>·</span>
                      <span>{timeAgo(doc.created_at)}</span>
                      {doc.profiles && (
                        <>
                          <span>·</span>
                          <span>{doc.profiles.full_name ?? doc.profiles.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
