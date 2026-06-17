import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import type { Profile } from '@/types'

const values = [
  {
    title: 'Excellence Without Exception',
    body: 'We hold every department to the highest standard. There is no second place in live entertainment — every show we touch must leave an impression.',
  },
  {
    title: 'One Team, One Show',
    body: 'From Sales to Tech, we operate as a single unit. Great productions are never built by one department alone — they are earned through seamless collaboration.',
  },
  {
    title: 'Integrity in Every Promise',
    body: 'We honour our word to clients, to artists, and to each other. Our reputation is built on delivery, and delivery is built on trust.',
  },
  {
    title: 'Innovation in Our DNA',
    body: 'We continuously improve our processes, tools, and craft — because the world changes, and so do our audiences. Complacency is not an option.',
  },
  {
    title: 'People Build Legacies',
    body: 'Our team is our greatest asset. We invest in their growth, their voice, and their craft — because the stage is only as strong as those who build it.',
  },
]

export default async function MissionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)

  return (
    <>
      <Header title="Mission & Values" profile={profile as Profile | null} unreadCount={unreadCount ?? 0} />

      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-10">

        {/* Tagline */}
        <div className="text-center py-10 border-b border-zinc-800">
          <p className="text-xs font-semibold text-[#E7191F] uppercase tracking-widest mb-4">MegaStar Arena KL</p>
          <blockquote className="text-2xl md:text-3xl font-bold text-white leading-snug">
            &ldquo;Where the world becomes the stage,
            <br className="hidden sm:block" />
            {' '}and the stage becomes the world.&rdquo;
          </blockquote>
        </div>

        {/* Mission */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-[#E7191F] rounded-full" />
            <h2 className="text-xl font-bold text-white">Our Mission</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed text-base pl-4">
            To deliver Malaysia&apos;s most extraordinary live entertainment experiences — where world-class production meets
            effortless logistics, and every show is executed without compromise. We exist to make the impossible look seamless.
          </p>
        </div>

        {/* Vision */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-[#E7191F] rounded-full" />
            <h2 className="text-xl font-bold text-white">Our Vision</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed text-base pl-4">
            To make Kuala Lumpur a premier destination for live events in Asia — building a legacy where artists
            choose MegaStar as their stage and audiences return for the memories. We are building something that
            outlasts any single show.
          </p>
        </div>

        {/* Values */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-[#E7191F] rounded-full" />
            <h2 className="text-xl font-bold text-white">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 pl-4">
            {values.map((v, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-[#E7191F] font-bold text-sm w-5 flex-shrink-0 mt-0.5">0{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-white mb-1.5">{v.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{v.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-zinc-800">
          <p className="text-zinc-700 text-xs">MegaStar Arena Sdn Bhd · Kuala Lumpur, Malaysia</p>
        </div>
      </div>
    </>
  )
}
