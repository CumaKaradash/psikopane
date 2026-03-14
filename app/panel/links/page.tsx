// app/panel/links/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LinksClient from '@/components/panel/LinksClient'

export default async function LinksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('slug').eq('id', user.id).single()

  const [{ data: tests }, { data: homework }] = await Promise.all([
    supabase.from('tests').select('id, title, slug, is_active').eq('psychologist_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('homework').select('id, title, slug, is_active').eq('psychologist_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
  ])

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <h2 className="font-serif text-xl pl-10 md:pl-0">Link Gönder</h2>
        <p className="text-xs text-muted mt-0.5">Danışanlarınıza test veya ödev linki gönderin</p>
      </header>
      <LinksClient
        tests={tests ?? []}
        homework={homework ?? []}
        profileSlug={profile?.slug ?? ''}
      />
    </>
  )
}
