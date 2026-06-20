'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldX, LogOut } from 'lucide-react'

export default function NoAccessPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="MegaStar Arena KL" width={180} height={60} className="object-contain" priority />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="h-1 bg-[#E7191F]" />
          <div className="px-8 py-10">
            <div className="w-14 h-14 rounded-2xl bg-[#E7191F]/10 flex items-center justify-center mx-auto mb-5">
              <ShieldX className="w-7 h-7 text-[#E7191F]" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Access not available</h1>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
              This account isn&apos;t authorised to use the MegaStar Arena CRM, or your access has been removed.
              If you think this is a mistake, please contact your manager.
            </p>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 border border-zinc-700 text-white font-semibold py-3 px-4 rounded-xl hover:bg-zinc-700 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">© 2026 MegaStar Arena Sdn Bhd</p>
      </div>
    </div>
  )
}
