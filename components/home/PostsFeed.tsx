'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Send, X, Check, Pin, PinOff, MessageCircle, ArrowUpDown } from 'lucide-react'
import { MentionTextarea } from '@/components/home/MentionTextarea'
import { MentionText } from '@/components/home/MentionText'
import { extractMentionIds, type MentionPerson } from '@/lib/mentions'
import type { Post, PostReaction, PostComment, Profile } from '@/types'

const EMOJIS = ['👍', '❤️', '🎉', '👀']

interface PostsFeedProps {
  initialPosts: Post[]
  currentProfile: Profile | null
  people?: MentionPerson[]
}

export function PostsFeed({ initialPosts, currentProfile, people = [] }: PostsFeedProps) {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const peopleNames = useMemo(() => people.map(p => p.full_name ?? '').filter(Boolean), [people])
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [sortAsc, setSortAsc] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [reactionPopup, setReactionPopup] = useState<string | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const reactionRef = useRef<HTMLDivElement>(null)

  const isAdmin = currentProfile?.role === 'admin'
  const canPin = currentProfile?.role === 'admin' || currentProfile?.role === 'department_head'

  // Close reaction popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (reactionRef.current && !reactionRef.current.contains(e.target as Node)) {
        setReactionPopup(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sortedPosts = useMemo(() => {
    const pinned = posts.filter(p => p.is_pinned).sort((a, b) =>
      (b.pinned_at ?? '').localeCompare(a.pinned_at ?? '')
    )
    const regular = posts.filter(p => !p.is_pinned).sort((a, b) =>
      sortAsc
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at)
    )
    return [...pinned, ...regular]
  }, [posts, sortAsc])

  const handlePost = async () => {
    if (!newContent.trim() || !currentProfile) return
    setSubmitting(true)
    const content = newContent.trim()
    const mentionedIds = extractMentionIds(content, people)
    const { data } = await supabase
      .from('posts')
      .insert({ content, created_by: currentProfile.id, mentions: mentionedIds })
      .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at), post_reactions(id, post_id, user_id, emoji, created_at), post_comments(id, post_id, user_id, content, created_at, updated_at, profiles(id, full_name, email, avatar_url))')
      .single()
    if (data) {
      setPosts(p => [data as Post, ...p])
      setNewContent('')

      const { data: recipients } = await supabase
        .from('profiles')
        .select('id, is_active')
        .neq('id', currentProfile.id)
      const activeRecipients = (recipients ?? []).filter(r => r.is_active !== false)
      if (activeRecipients.length > 0) {
        const authorName = currentProfile.full_name ?? currentProfile.email
        const mentionSet = new Set(mentionedIds)
        await supabase.from('notifications').insert(
          activeRecipients.map(r => mentionSet.has(r.id)
            ? { user_id: r.id, title: `${authorName} mentioned you`, message: content.slice(0, 100), type: 'mention' as const }
            : { user_id: r.id, title: `${authorName} posted an update`, message: content.slice(0, 100), type: 'new_post' as const }
          )
        )
      }
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
      .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at), post_reactions(id, post_id, user_id, emoji, created_at), post_comments(id, post_id, user_id, content, created_at, updated_at, profiles(id, full_name, email, avatar_url))')
      .single()
    if (data) setPosts(p => p.map(x => x.id === post.id ? data as Post : x))
    setEditingId(null)
    setEditContent('')
  }

  const handlePin = async (post: Post) => {
    if (post.is_pinned) {
      await supabase.from('posts').update({ is_pinned: false, pinned_at: null }).eq('id', post.id)
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, is_pinned: false, pinned_at: null } : p))
    } else {
      const pinnedCount = posts.filter(p => p.is_pinned).length
      if (pinnedCount >= 3) {
        setPinError('Maximum 3 posts can be pinned. Unpin one first.')
        setTimeout(() => setPinError(null), 3000)
        return
      }
      const now = new Date().toISOString()
      await supabase.from('posts').update({ is_pinned: true, pinned_at: now }).eq('id', post.id)
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, is_pinned: true, pinned_at: now } : p))
    }
  }

  const handleReaction = async (postId: string, emoji: string) => {
    if (!currentProfile) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const existing = post.post_reactions?.find(r => r.user_id === currentProfile.id && r.emoji === emoji)

    if (existing) {
      await supabase.from('post_reactions').delete().eq('id', existing.id)
      setPosts(ps => ps.map(p => p.id === postId
        ? { ...p, post_reactions: p.post_reactions?.filter(r => r.id !== existing.id) }
        : p
      ))
    } else {
      const { data } = await supabase.from('post_reactions')
        .insert({ post_id: postId, user_id: currentProfile.id, emoji })
        .select().single()
      if (data) {
        setPosts(ps => ps.map(p => p.id === postId
          ? { ...p, post_reactions: [...(p.post_reactions ?? []), data as PostReaction] }
          : p
        ))
      }
    }
    setReactionPopup(null)
  }

  const handleComment = async (postId: string) => {
    const content = newComments[postId]?.trim()
    if (!content || !currentProfile) return
    const mentionedIds = extractMentionIds(content, people)
    const { data } = await supabase.from('post_comments')
      .insert({ post_id: postId, user_id: currentProfile.id, content, mentions: mentionedIds })
      .select('*, profiles(id, full_name, email, avatar_url)')
      .single()
    if (data) {
      setPosts(ps => ps.map(p => p.id === postId
        ? { ...p, post_comments: [...(p.post_comments ?? []), data as PostComment] }
        : p
      ))
      setNewComments(n => ({ ...n, [postId]: '' }))

      const targets = mentionedIds.filter(id => id !== currentProfile.id)
      if (targets.length > 0) {
        const authorName = currentProfile.full_name ?? currentProfile.email
        await supabase.from('notifications').insert(targets.map(id => ({
          user_id: id,
          title: `${authorName} mentioned you in a comment`,
          message: content.slice(0, 100),
          type: 'mention' as const,
        })))
      }
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    await supabase.from('post_comments').delete().eq('id', commentId)
    setPosts(ps => ps.map(p => p.id === postId
      ? { ...p, post_comments: p.post_comments?.filter(c => c.id !== commentId) }
      : p
    ))
  }

  const toggleComments = (postId: string) => {
    setExpandedComments(s => {
      const next = new Set(s)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const getReactionGroups = (reactions: PostReaction[] | undefined) => {
    const groups: Record<string, { count: number; mine: boolean }> = {}
    for (const r of reactions ?? []) {
      if (!groups[r.emoji]) groups[r.emoji] = { count: 0, mine: false }
      groups[r.emoji].count++
      if (r.user_id === currentProfile?.id) groups[r.emoji].mine = true
    }
    return groups
  }

  return (
    <div className="space-y-4">
      {/* Compose + sort row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-600">
          {sortedPosts.filter(p => p.is_pinned).length > 0 && `📌 ${sortedPosts.filter(p => p.is_pinned).length} pinned · `}
          {posts.length} post{posts.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setSortAsc(s => !s)}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortAsc ? 'Oldest first' : 'Newest first'}
        </button>
      </div>

      {pinError && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          {pinError}
        </div>
      )}

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
            <MentionTextarea
              value={newContent}
              onChange={setNewContent}
              people={people}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handlePost() } }}
              placeholder="Share an update with the team... type @ to mention someone"
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#E7191F] focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-700">⌘↵ to post</span>
              <Button size="sm" onClick={handlePost} disabled={submitting || !newContent.trim()} className="gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {sortedPosts.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-10 text-center">
          <p className="text-zinc-500 text-sm">No posts yet — be the first to share an update.</p>
        </div>
      ) : (
        sortedPosts.map(post => {
          const author = post.profiles
          const isOwner = currentProfile?.id === post.created_by
          const canDelete = isOwner || isAdmin
          const isEditing = editingId === post.id
          const commentsOpen = expandedComments.has(post.id)
          const reactionGroups = getReactionGroups(post.post_reactions)
          const commentCount = post.post_comments?.length ?? 0

          return (
            <div
              key={post.id}
              className={cn(
                'bg-zinc-900 rounded-xl border p-4 transition-colors',
                post.is_pinned ? 'border-[#E7191F]/30 bg-[#E7191F]/[0.03]' : 'border-zinc-800'
              )}
            >
              {/* Pin banner */}
              {post.is_pinned && (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#E7191F] mb-3 uppercase tracking-wide">
                  <Pin className="w-3 h-3" />
                  Pinned
                </div>
              )}

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
                    <div className="flex items-center gap-0.5">
                      {canPin && !isEditing && (
                        <button
                          onClick={() => handlePin(post)}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            post.is_pinned
                              ? 'text-[#E7191F] hover:bg-[#E7191F]/10'
                              : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
                          )}
                          title={post.is_pinned ? 'Unpin post' : 'Pin post'}
                        >
                          {post.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {isOwner && !isEditing && (
                        <button
                          onClick={() => { setEditingId(post.id); setEditContent(post.content) }}
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
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap"><MentionText text={post.content} names={peopleNames} /></p>
                  )}
                </div>
              </div>

              {/* Reactions + comment toggle row */}
              {!isEditing && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/60 flex-wrap">
                  {/* Existing reaction pills */}
                  {Object.entries(reactionGroups).map(([emoji, { count, mine }]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(post.id, emoji)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                        mine
                          ? 'bg-[#E7191F]/15 border-[#E7191F]/30 text-white'
                          : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      )}
                    >
                      <span>{emoji}</span>
                      <span>{count}</span>
                    </button>
                  ))}

                  {/* Add reaction */}
                  <div className="relative" ref={reactionPopup === post.id ? reactionRef : undefined}>
                    <button
                      onClick={() => setReactionPopup(p => p === post.id ? null : post.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-zinc-600 hover:text-zinc-400 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      + React
                    </button>
                    {reactionPopup === post.id && (
                      <div className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded-xl p-2 flex gap-1.5 shadow-xl z-20">
                        {EMOJIS.map(emoji => {
                          const alreadyReacted = post.post_reactions?.some(r => r.user_id === currentProfile?.id && r.emoji === emoji)
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(post.id, emoji)}
                              className={cn(
                                'text-xl p-1.5 rounded-lg hover:bg-zinc-700 transition-colors',
                                alreadyReacted && 'bg-[#E7191F]/20'
                              )}
                            >
                              {emoji}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Comment toggle */}
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="ml-auto flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
                  </button>
                </div>
              )}

              {/* Comments section */}
              {!isEditing && commentsOpen && (
                <div className="mt-3 space-y-3">
                  {post.post_comments?.map(comment => {
                    const cAuthor = comment.profiles
                    const canDeleteComment = currentProfile?.id === comment.user_id || isAdmin
                    return (
                      <div key={comment.id} className="flex items-start gap-2.5 group">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={cAuthor?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-zinc-800 text-zinc-400 text-[10px] font-bold">
                            {getInitials(cAuthor?.full_name ?? null, cAuthor?.email ?? '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 bg-zinc-800/60 rounded-xl px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-zinc-300">
                              {cAuthor?.full_name ?? cAuthor?.email ?? 'Staff'}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-zinc-600">{timeAgo(comment.created_at)}</span>
                              {canDeleteComment && (
                                <button
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-700 hover:text-red-400 transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed whitespace-pre-wrap"><MentionText text={comment.content} names={peopleNames} /></p>
                        </div>
                      </div>
                    )
                  })}

                  {/* New comment input */}
                  <div className="flex items-center gap-2 pt-1">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={currentProfile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-[#E7191F]/20 text-[#E7191F] text-[10px] font-bold">
                        {getInitials(currentProfile?.full_name ?? null, currentProfile?.email ?? '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-2xl px-3 py-1.5">
                      <MentionTextarea
                        value={newComments[post.id] ?? ''}
                        onChange={v => setNewComments(n => ({ ...n, [post.id]: v }))}
                        people={people}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id) } }}
                        placeholder="Write a comment... type @ to mention"
                        rows={1}
                        wrapperClassName="flex-1"
                        className="w-full bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed py-0.5"
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!newComments[post.id]?.trim()}
                        className="text-[#E7191F] disabled:text-zinc-700 transition-colors flex-shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
