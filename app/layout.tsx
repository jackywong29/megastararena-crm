import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MegaStar Arena — CRM',
  description: 'Internal show management platform for MegaStar Arena, Kuala Lumpur',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-zinc-950">
      <body className="h-full bg-zinc-950">{children}</body>
    </html>
  )
}
