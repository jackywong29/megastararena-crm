import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import type { Profile } from '@/types'

const values = [
  {
    word: 'LEAD',
    title: 'We set the standard',
    body: 'We hold every department to the highest standard. There is no second place in live entertainment — every show we touch must leave an impression.',
  },
  {
    word: 'HOME',
    title: 'We build belonging',
    body: 'MegaStar Arena is where artists feel at home on stage and audiences feel at home in the crowd. We create the conditions for that to happen, every time.',
  },
  {
    word: 'ENTERTAIN',
    title: 'We go beyond the stage',
    body: 'Great entertainment is more than a performance. It\'s the feeling in the room, the memory that lingers. We own every detail that creates that moment.',
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
          <div className="flex items-center justify-center gap-3 mb-3">
            {['LEAD', 'HOME', 'ENTERTAIN'].map((word, i) => (
              <span key={word} className="flex items-center gap-3">
                <span className="text-lg md:text-xl font-black text-white tracking-wide">{word}</span>
                {i < 2 && <span className="text-[#E7191F] font-bold text-xl">·</span>}
              </span>
            ))}
          </div>
          <p className="text-zinc-500 text-sm italic">We set the standard, build belonging and go beyond the stage</p>
        </div>

        {/* Mission */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-[#E7191F] rounded-full" />
            <h2 className="text-xl font-bold text-white">Our Mission</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed text-base pl-4">
            The leading home of entertainment. Where world-class artists perform, audiences feel at home, and every show leaves a lasting mark.
          </p>
        </div>

        {/* Vision */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-[#E7191F] rounded-full" />
            <h2 className="text-xl font-bold text-white">Our Vision</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed text-base pl-4">
            To be Kuala Lumpur&apos;s most sought-after concert venue — a stage where great artists shine, audiences feel something real, and every guest leaves with a memory.
          </p>
        </div>

        {/* Values */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-[#E7191F] rounded-full" />
            <h2 className="text-xl font-bold text-white">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4">
            {values.map((v, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors text-center">
                <div className="text-[#E7191F] font-black text-2xl tracking-widest mb-3">{v.word}</div>
                <h3 className="font-semibold text-white mb-3">{v.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{v.body}</p>
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
