// app/panel/tests/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TestsClient from '@/components/panel/TestsClient'

export default async function TestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('slug').eq('id', user.id).single()

  const { data: tests } = await supabase
    .from('tests')
    .select('*, responses:test_responses(count)')
    .eq('psychologist_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <h2 className="font-serif text-xl pl-10 md:pl-0">Test Yönetimi</h2>
      </header>
      <TestsClient tests={tests ?? []} profileSlug={profile?.slug ?? ''} />
    </>
  )
}
