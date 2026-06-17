'use client'

import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Red glow accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(231,25,31,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Decorative dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { w: 2, h: 2, t: 8,  l: 12, o: 0.15 },
          { w: 1, h: 1, t: 15, l: 75, o: 0.2 },
          { w: 2, h: 2, t: 22, l: 33, o: 0.1 },
          { w: 1, h: 1, t: 30, l: 88, o: 0.2 },
          { w: 2, h: 2, t: 45, l: 5,  o: 0.15 },
          { w: 1, h: 1, t: 50, l: 60, o: 0.2 },
          { w: 2, h: 2, t: 60, l: 42, o: 0.1 },
          { w: 1, h: 1, t: 68, l: 90, o: 0.2 },
          { w: 2, h: 2, t: 75, l: 20, o: 0.15 },
          { w: 1, h: 1, t: 82, l: 55, o: 0.2 },
          { w: 2, h: 2, t: 88, l: 78, o: 0.1 },
          { w: 1, h: 1, t: 5,  l: 48, o: 0.2 },
          { w: 2, h: 2, t: 35, l: 65, o: 0.15 },
          { w: 1, h: 1, t: 92, l: 30, o: 0.2 },
          { w: 2, h: 2, t: 18, l: 95, o: 0.1 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: s.w, height: s.h, top: `${s.t}%`, left: `${s.l}%`, opacity: s.o }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image
            src="/logo.png"
            alt="MegaStar Arena KL"
            width={220}
            height={72}
            className="object-contain"
            priority
          />
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Red accent top bar */}
          <div className="h-1 bg-[#E7191F]" />

          <div className="px-8 py-8">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-zinc-500 text-sm mb-8">Sign in to access the internal management platform.</p>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 border border-zinc-700 text-white font-semibold py-3 px-4 rounded-xl hover:bg-zinc-700 hover:border-zinc-600 transition-all"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-xs text-zinc-600 mt-6">
              For authorised MegaStar Arena staff only
            </p>
          </div>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">
          © 2026 MegaStar Arena Sdn Bhd
        </p>
      </div>
    </div>
  )
}
