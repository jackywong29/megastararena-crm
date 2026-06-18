import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { Profile, Post } from '@/types'

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  if (!profile) redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  const p = profile as Profile
  const userPosts = (posts ?? []) as Post[]

  return (
    <>
      <Header title="Profile" profile={p} unreadCount={unreadCount ?? 0} />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <h2 className="text-lg font-bold text-white mb-6">Your Profile</h2>
        <ProfileForm profile={p} />

        {/* Posts feed */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Your Posts</h2>
            <span className="text-xs text-zinc-600">{userPosts.length} post{userPosts.length !== 1 ? 's' : ''}</span>
          </div>

          {userPosts.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
              <p className="text-zinc-500 text-sm">You haven&apos;t posted anything yet.</p>
              <p className="text-zinc-700 text-xs mt-1">Posts you share on the Home Feed will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userPosts.map(post => (
                <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  <p className="text-xs text-zinc-600 mt-3">{formatTimeAgo(post.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
