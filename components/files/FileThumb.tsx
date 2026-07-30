'use client'

import { FileText, FileImage, FileSpreadsheet, FileArchive, FileVideo, FileAudio, File } from 'lucide-react'
import { cn } from '@/lib/utils'

// Google-Drive-style file presentation, shared by the show Docs tab and the
// Company Hub: images render as a real thumbnail, everything else gets a
// colour-coded tile so file types are recognisable at a glance.

type Kind = 'image' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'archive' | 'video' | 'audio' | 'other'

export function fileKind(type: string | null, name?: string): Kind {
  const t = (type ?? '').toLowerCase()
  const ext = (name ?? '').toLowerCase().split('.').pop() ?? ''
  if (t.startsWith('image/')) return 'image'
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'audio'
  if (t === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (t.includes('spreadsheet') || t === 'text/csv' || ['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (t.includes('presentation') || ['ppt', 'pptx', 'key'].includes(ext)) return 'slides'
  if (t.includes('word') || t.startsWith('text/') || ['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) return 'doc'
  if (t.includes('zip') || t.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive'
  return 'other'
}

const KIND_STYLE: Record<Kind, { Icon: typeof File; text: string; bg: string; label: string }> = {
  image:   { Icon: FileImage,       text: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Image' },
  pdf:     { Icon: FileText,        text: 'text-[#E7191F]',   bg: 'bg-[#E7191F]/10',   label: 'PDF' },
  doc:     { Icon: FileText,        text: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Document' },
  sheet:   { Icon: FileSpreadsheet, text: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Spreadsheet' },
  slides:  { Icon: FileText,        text: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Slides' },
  archive: { Icon: FileArchive,     text: 'text-orange-400',  bg: 'bg-orange-500/10',  label: 'Archive' },
  video:   { Icon: FileVideo,       text: 'text-pink-400',    bg: 'bg-pink-500/10',    label: 'Video' },
  audio:   { Icon: FileAudio,       text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    label: 'Audio' },
  other:   { Icon: File,            text: 'text-zinc-400',    bg: 'bg-zinc-700/40',    label: 'File' },
}

export function kindLabel(type: string | null, name?: string) {
  return KIND_STYLE[fileKind(type, name)].label
}

export function FileThumb({
  type, name, url, size = 'md', className,
}: {
  type: string | null
  name?: string
  url?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const kind = fileKind(type, name)
  const { Icon, text, bg } = KIND_STYLE[kind]
  const box = size === 'lg' ? 'w-full h-28' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const icon = size === 'lg' ? 'w-7 h-7' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  if (kind === 'image' && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? 'File preview'}
        loading="lazy"
        className={cn(box, 'rounded-lg object-cover bg-zinc-800 flex-shrink-0', className)}
      />
    )
  }

  return (
    <div className={cn(box, bg, 'rounded-lg flex items-center justify-center flex-shrink-0', className)}>
      <Icon className={cn(icon, text)} />
    </div>
  )
}
