'use client'

import { useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Download, Trash2, Upload, Loader2, FolderOpen, Plus, Folder, FolderPlus,
  ChevronRight, Home, FolderInput, Pencil, Check, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatFileSize, timeAgo, cn } from '@/lib/utils'
import { FileThumb, kindLabel } from '@/components/files/FileThumb'
import { FilePreview } from '@/components/files/FilePreview'
import type { CompanyFile, CompanyFolder, Profile } from '@/types'

interface CompanyFileListProps {
  initialFiles: CompanyFile[]
  initialFolders?: CompanyFolder[]
  currentProfile: Profile | null
}

export function CompanyFileList({ initialFiles, initialFolders = [], currentProfile }: CompanyFileListProps) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<CompanyFile[]>(initialFiles)
  const [folders, setFolders] = useState<CompanyFolder[]>(initialFolders)
  const [cwd, setCwd] = useState<string | null>(null)          // null = top level
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [newFolder, setNewFolder] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<CompanyFile | null>(null)

  const isAdmin = currentProfile?.role === 'admin'
  const canUpload = isAdmin || currentProfile?.role === 'department_head'

  // Breadcrumb trail from the top level down to the folder we're in.
  const trail = useMemo(() => {
    const out: CompanyFolder[] = []
    let id = cwd
    while (id) {
      const f = folders.find(x => x.id === id)
      if (!f) break
      out.unshift(f)
      id = f.parent_id
    }
    return out
  }, [cwd, folders])

  const visibleFolders = folders.filter(f => (f.parent_id ?? null) === cwd)
  const visibleFiles = files.filter(f => (f.folder_id ?? null) === cwd)

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
      folder_id: cwd,
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

  const canDelete = (cf: CompanyFile) => isAdmin || cf.uploaded_by === currentProfile?.id

  const createFolder = async () => {
    const name = (newFolder ?? '').trim()
    if (!name) { setNewFolder(null); return }
    const { data } = await supabase.from('company_folders').insert({
      name,
      parent_id: cwd,
      created_by: currentProfile?.id ?? null,
    }).select().single()
    if (data) setFolders(f => [...f, data as CompanyFolder])
    setNewFolder(null)
  }

  // Deleting a folder keeps its files — they fall back to the top level
  // (ON DELETE SET NULL), and nested folders go with it.
  const deleteFolder = async (folder: CompanyFolder) => {
    const inside = files.filter(f => f.folder_id === folder.id).length
    const msg = inside > 0
      ? `Delete folder "${folder.name}"? Its ${inside} file${inside === 1 ? '' : 's'} will move back to the top level.`
      : `Delete folder "${folder.name}"?`
    if (!confirm(msg)) return
    await supabase.from('company_folders').delete().eq('id', folder.id)
    setFolders(fs => fs.filter(x => x.id !== folder.id))
    setFiles(fs => fs.map(x => (x.folder_id === folder.id ? { ...x, folder_id: null } : x)))
  }

  const saveRename = async (cf: CompanyFile) => {
    const name = renameDraft.trim()
    setRenamingId(null)
    if (!name || name === cf.name) return
    setFiles(fs => fs.map(x => (x.id === cf.id ? { ...x, name } : x)))
    await supabase.from('company_files').update({ name }).eq('id', cf.id)
  }

  const moveFile = async (cf: CompanyFile, folderId: string | null) => {
    setMovingId(null)
    if ((cf.folder_id ?? null) === folderId) return
    setFiles(fs => fs.map(x => (x.id === cf.id ? { ...x, folder_id: folderId } : x)))
    await supabase.from('company_files').update({ folder_id: folderId }).eq('id', cf.id)
  }

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0

  return (
    <div className="space-y-4">
      {/* Toolbar: breadcrumb + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-sm min-w-0 flex-1">
          <button
            onClick={() => setCwd(null)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              cwd === null ? 'text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
            )}
          >
            <Home className="w-3.5 h-3.5" />
            Company Hub
          </button>
          {trail.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1 min-w-0">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />
              <button
                onClick={() => setCwd(f.id)}
                className={cn(
                  'px-2 py-1 rounded-lg truncate transition-colors',
                  i === trail.length - 1 ? 'text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                )}
              >
                {f.name}
              </button>
            </span>
          ))}
        </div>

        {canUpload && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNewFolder('')}>
              <FolderPlus className="w-4 h-4" /> New folder
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4" /> Upload
            </Button>
          </div>
        )}
      </div>

      {/* New-folder inline row */}
      {newFolder !== null && (
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <Folder className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <Input
            value={newFolder}
            onChange={e => setNewFolder(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') createFolder()
              if (e.key === 'Escape') setNewFolder(null)
            }}
            placeholder="Folder name"
            className="flex-1 h-8 text-sm"
            autoFocus
          />
          <Button size="sm" onClick={createFolder}>Create</Button>
          <Button size="sm" variant="ghost" onClick={() => setNewFolder(null)}>Cancel</Button>
        </div>
      )}

      {/* Upload panel */}
      {canUpload && showUpload && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">
            Upload to {trail.length > 0 ? trail[trail.length - 1].name : 'Company Hub'}
          </h3>
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

      {/* Contents */}
      {isEmpty ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-medium">
            {cwd === null ? 'No files yet' : 'This folder is empty'}
          </p>
          <p className="text-zinc-700 text-xs mt-1">Upload company documents, SOPs, templates and more</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-800/50">
            {/* Folders first, like Drive */}
            {visibleFolders.map(folder => {
              const count = files.filter(f => f.folder_id === folder.id).length
              return (
                <div key={folder.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 group transition-colors">
                  <button onClick={() => setCwd(folder.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Folder className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{folder.name}</div>
                      <div className="text-xs text-zinc-600 mt-0.5">
                        {count} file{count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </button>
                  {canUpload && (
                    <button
                      onClick={() => deleteFolder(folder)}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}

            {/* Files */}
            {visibleFiles.map(cf => {
              const isRenaming = renamingId === cf.id
              const isMoving = movingId === cf.id
              return (
                <div key={cf.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 group transition-colors">
                  <button
                    onClick={() => setPreview(cf)}
                    title="Preview"
                    className="flex-shrink-0 rounded-lg hover:ring-2 hover:ring-zinc-700 transition-all"
                  >
                    <FileThumb type={cf.file_type} name={cf.name} url={cf.file_url} />
                  </button>

                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameDraft}
                          onChange={e => setRenameDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveRename(cf)
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <button onClick={() => saveRename(cf)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded" title="Save">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRenamingId(null)} className="p-1.5 text-zinc-500 hover:bg-zinc-800 rounded" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : isMoving ? (
                      <div className="flex items-center gap-2">
                        <select
                          autoFocus
                          defaultValue={cf.folder_id ?? ''}
                          onChange={e => moveFile(cf, e.target.value || null)}
                          className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-2 py-1.5"
                        >
                          <option value="">Company Hub (top level)</option>
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button onClick={() => setMovingId(null)} className="p-1.5 text-zinc-500 hover:bg-zinc-800 rounded" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setPreview(cf)}
                          className="text-sm font-medium text-white truncate hover:text-[#E7191F] transition-colors text-left w-full"
                        >
                          {cf.name}
                        </button>
                        {cf.description && (
                          <div className="text-xs text-zinc-500 mt-0.5 truncate">{cf.description}</div>
                        )}
                        <div className="text-xs text-zinc-700 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{kindLabel(cf.file_type, cf.name)}</span>
                          {cf.file_size && <><span>·</span><span>{formatFileSize(cf.file_size)}</span></>}
                          <span>·</span>
                          <span>{timeAgo(cf.created_at)}</span>
                          {cf.profiles && (
                            <>
                              <span>·</span>
                              <span>{cf.profiles.full_name ?? cf.profiles.email}</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {!isRenaming && !isMoving && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canUpload && (
                        <>
                          <button
                            onClick={() => { setRenamingId(cf.id); setRenameDraft(cf.name) }}
                            className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Rename"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setMovingId(cf.id)}
                            className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Move to folder"
                          >
                            <FolderInput className="w-4 h-4" />
                          </button>
                        </>
                      )}
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
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {preview && (
        <FilePreview
          name={preview.name}
          url={preview.file_url}
          type={preview.file_type}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
