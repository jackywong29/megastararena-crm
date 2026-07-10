import { redirect } from 'next/navigation'
import { getClient, getAuthUser, getProfile, getUnreadCount } from '@/lib/supabase/cached'
import { Header } from '@/components/layout/Header'
import { CompanyFileList } from '@/components/company/CompanyFileList'
import type { Profile, CompanyFile } from '@/types'

export default async function CompanyPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  const supabase = await getClient()

  const [profile, unreadCount, { data: files }] = await Promise.all([
    getProfile(),
    getUnreadCount(),
    supabase
      .from('company_files')
      .select('*, profiles(id, full_name, email, avatar_url, department, role, created_at, updated_at)')
      .order('created_at', { ascending: false }),
  ])

  return (
    <>
      <Header title="Company Hub" profile={profile as Profile | null} unreadCount={unreadCount ?? 0} />

      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white">Company Hub</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Shared files, SOPs, templates, and reference documents for all staff.
            Department heads and above can upload. All staff can download.
          </p>
        </div>

        <CompanyFileList
          initialFiles={(files ?? []) as CompanyFile[]}
          currentProfile={profile as Profile | null}
        />
      </div>
    </>
  )
}
