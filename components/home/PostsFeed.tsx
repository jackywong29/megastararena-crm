'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Send, X, Check } from 'lucide-react'
import type { Post, Profile } from '@/types'

interface PostsFeedProps {
  initialPosts: Post[]
  currentProfile: Profile | null
}

export function PostsFeed({ initialPosts, currentProfile }: PostsFeedProps) {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const isAdmin = currentProfile?.role === 'admin'

  const handlePost = async () => {
    if (!newContent.trim() || !currentProfile) return
    setSubmitting(true)

    const { data } = await supabase
      .from('posts')
      .insert({ content: newContent.trim(), created_by: currentProfile.id })
      .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)')
      .single()

    if (data) {
      setPosts(p => [data as Post, ...p])
      setNewContent('')
    }
    setSubmitting(false)
  }

  const handleDelete = async (post: Post) => {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', post.id)
    setPosts(p => p.filter(x => x.id !== post.id))
  }

  const handleEdit = async (post: Post) => {
    if (!editContent.trim()) return
    const { data } = await supabase
      .from('posts')
      .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq('id', post.id)
      .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)')
      .single()

    if (data) {
      setPosts(p => p.map(x => x.id === post.id ? data as Post : x))
    }
    setEditingId(null)
    setEditContent('')
  }

  const startEdit = (post: Post) => {
    setEditingId(post.id)
    setEditContent(post.content)
  }

  return (
    <div className="space-y-4">
      {/* Compose box */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={currentProfile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-xs font-semibold">
              {getInitials(currentProfile?.full_name ?? null, currentProfile?.email ?? '')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
              }}
              placeholder="Share an update with the team... (work-related only)"
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E7191F] focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-700">Work-related posts only. Press ⌘↵ to post.</span>
              <Button size="sm" onClick={handlePost} disabled={submitting || !newContent.trim()} className="gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-10 text-center">
          <p className="text-zinc-500 text-sm">No posts yet — be the first to share an update.</p>
        </div>
      ) : (
        posts.map(post => {
          const author = post.profiles
          const isOwner = currentProfile?.id === post.created_by
          const canDelete = isOwner || isAdmin
          const canEdit = isOwner
          const isEditing = editingId === post.id

          return (
            <div key={post.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={author?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-xs font-semibold">
                    {getInitials(author?.full_name ?? null, author?.email ?? '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <span className="text-sm font-semibold text-white">
                        {author?.full_name ?? author?.email ?? 'Staff'}
                      </span>
                      <span className="text-xs text-zinc-600 ml-2">{timeAgo(post.created_at)}</span>
                      {post.updated_at !== post.created_at && (
                        <span className="text-xs text-zinc-700 ml-1">(edited)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {canEdit && !isEditing && (
                        <button
                          onClick={() => startEdit(post)}
                          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && !isEditing && (
                        <button
                          onClick={() => handleDelete(post)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={3}
                        autoFocus
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E7191F] focus:border-transparent resize-none"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEdit(post)} className="gap-1">
                          <Check className="w-3.5 h-3.5" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditContent('') }}>
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
