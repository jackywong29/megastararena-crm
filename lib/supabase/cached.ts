import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

// Per-request memoized data helpers.
//
// The dashboard layout AND every page used to independently re-fetch the auth
// user, the profile, and the unread-notification count — 2–3 duplicate network
// round trips on every navigation. React's cache() dedupes these within a
// single server render pass, so the layout and the page share one result.
// Always import these in server components instead of re-querying.

export const getClient = cache(async () => createClient())

export const getAuthUser = cache(async () => {
  const supabase = await getClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser()
  if (!user) return null
  const supabase = await getClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return (data as Profile | null) ?? null
})

export const getUnreadCount = cache(async (): Promise<number> => {
  const user = await getAuthUser()
  if (!user) return 0
  const supabase = await getClient()
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
  return count ?? 0
})
