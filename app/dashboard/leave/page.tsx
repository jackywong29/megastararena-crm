import { redirect } from 'next/navigation'

// The leave system is currently hidden (may be re-enabled later). The page,
// the leave_applications table, and LeavePageClient.tsx are all kept intact —
// to bring it back, restore this page's original contents and the nav links.
export default function LeavePage() {
  redirect('/dashboard')
}
