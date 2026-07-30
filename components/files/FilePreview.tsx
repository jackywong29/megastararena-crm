'use client'

import { useEffect } from 'react'
import { X, Download, ExternalLink } from 'lucide-react'
import { fileKind } from '@/components/files/FileThumb'

// Drive-style preview: images and PDFs open inline instead of downloading.
// Anything we can't render in-browser falls back to a download prompt.
export function FilePreview({
  name, url, type, onClose,
}: {
  name: string
  url: string
  type: string | null
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Don't let the page behind scroll while the overlay is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const kind = fileKind(type, name)
  const canPreview = kind === 'image' || kind === 'pdf' || kind === 'video' || kind === 'audio'

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${name}`}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-sm text-white font-medium truncate flex-1 min-w-0">{name}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href={url}
          download={name}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Close"
          aria-label="Close preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center p-4 pt-0"
        onClick={e => e.stopPropagation()}
      >
        {kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} className="max-w-full max-h-full object-contain rounded-lg" />
        )}
        {kind === 'pdf' && (
          <iframe src={url} title={name} className="w-full h-full rounded-lg bg-white" />
        )}
        {kind === 'video' && (
          <video src={url} controls className="max-w-full max-h-full rounded-lg" />
        )}
        {kind === 'audio' && (
          <audio src={url} controls className="w-full max-w-md" />
        )}
        {!canPreview && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center max-w-sm">
            <p className="text-white text-sm font-medium">No preview available</p>
            <p className="text-zinc-500 text-xs mt-1 mb-4">This file type can&apos;t be shown in the browser.</p>
            <a
              href={url}
              download={name}
              className="inline-flex items-center gap-2 bg-[#E7191F] hover:bg-[#c41218] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
