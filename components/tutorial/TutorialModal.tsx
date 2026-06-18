'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TUTORIAL_KEY = 'msa_tutorial_done'

const steps = [
  {
    emoji: '🎪',
    title: 'Welcome to MegaStar CRM',
    body: 'Your internal platform for managing every show at MegaStar Arena KL. Everything your team needs — from first inquiry to post-show debrief — lives here.',
  },
  {
    emoji: '🏠',
    title: 'Home Feed',
    body: 'The home screen shows your upcoming shows, live stats, and a team feed where anyone can post updates, announcements, or reminders for the whole team to see.',
  },
  {
    emoji: '🎭',
    title: 'Shows Pipeline',
    body: 'Every show moves through four stages: Inquiry → Confirmed → Show Day → Past Events. Each stage automatically loads the relevant SOP tasks for your department.',
  },
  {
    emoji: '📋',
    title: 'Show Details',
    body: 'Click any show to see the full overview, upload documents (tech riders, contracts, invoices), manage tasks, and track all activity on that show.',
  },
  {
    emoji: '✅',
    title: 'My Tasks',
    body: 'The Tasks section shows all pending tasks assigned to your department across every show, sorted by show date. Tap any task to mark it complete.',
  },
  {
    emoji: '🎯',
    title: 'Company Hub & Profile',
    body: 'Company Hub stores shared files — SOPs, venue specs, templates. Your Profile lets you set your display name and photo. You\'re all set — let\'s go!',
  },
]

export function TutorialModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(TUTORIAL_KEY)) {
      const timer = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      setStep(0)
      setOpen(true)
    }
    window.addEventListener('open-tutorial', handler)
    return () => window.removeEventListener('open-tutorial', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-[#E7191F] transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header row */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs text-zinc-600 font-medium">{step + 1} of {steps.length}</span>
            <button onClick={dismiss} className="text-zinc-600 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="text-center space-y-4 mb-8">
            <div className="text-5xl">{current.emoji}</div>
            <h2 className="text-xl font-bold text-white">{current.title}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">{current.body}</p>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${i === step ? 'w-5 h-1.5 bg-[#E7191F]' : 'w-1.5 h-1.5 bg-zinc-700'}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={dismiss} className="text-zinc-500">
                Skip
              </Button>
            )}
            <div className="flex-1" />
            {isLast ? (
              <Button size="sm" onClick={dismiss}>
                Get started
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
