// app/panel/archive/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArchivePageClient from '@/components/panel/ArchivePageClient'

export default async function ArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: files },
    { data: ownTests },
    { data: ownHw },
    { data: clients },
  ] = await Promise.all([
    supabase.from('files').select('*').eq('psychologist_id', user.id).order('created_at', { ascending: false }),
    supabase.from('tests').select('id, title, slug').eq('psychologist_id', user.id),
    supabase.from('homework').select('id, title, slug').eq('psychologist_id', user.id),
    supabase.from('clients').select('id, full_name, created_at, status').eq('psychologist_id', user.id).order('full_name'),
  ])

  const testIds = (ownTests ?? []).map(t => t.id)
  const hwIds   = (ownHw   ?? []).map(h => h.id)

  const [{ data: testResponses }, { data: hwResponses }] = await Promise.all([
    testIds.length > 0
      ? supabase.from('test_responses').select('id, test_id, respondent_name, total_score, completed_at').in('test_id', testIds).order('completed_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
    hwIds.length > 0
      ? supabase.from('homework_responses').select('id, homework_id, respondent_name, completed_at').in('homework_id', hwIds).order('completed_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
  ])

  const testMap = Object.fromEntries((ownTests ?? []).map(t => [t.id, t.title]))
  const hwMap   = Object.fromEntries((ownHw   ?? []).map(h => [h.id, h.title]))

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <h2 className="font-serif text-xl pl-10 md:pl-0">Arşiv</h2>
      </header>
      <ArchivePageClient
        userId={user.id}
        files={files ?? []}
        testResponses={testResponses ?? []}
        hwResponses={hwResponses ?? []}
        clients={clients ?? []}
        testMap={testMap}
        hwMap={hwMap}
      />
    </>
  )
}
