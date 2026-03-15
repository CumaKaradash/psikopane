// app/panel/community/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommunityClient from '@/components/panel/CommunityClient'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: publicTests, error } = await supabase
    .from('tests')
    .select(`
      id, title, description, questions, slug,
      psychologist_id, created_at, is_active, is_public,
      author:profiles!psychologist_id(id, full_name, title, slug)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(120)

  // Toplulukta kendi paylaştığı testler (istatistik için)
  const { count: myPublicCount } = await supabase
    .from('tests')
    .select('*', { count: 'exact', head: true })
    .eq('psychologist_id', user.id)
    .eq('is_public', true)

  // Supabase join bazen dizi döndürür, normalize et
  function normalizePublicTests(data: unknown[] | null) {
    return (data ?? []).map((item: unknown) => {
      const test = item as Record<string, unknown>
      return {
        id: test.id as string,
        title: test.title as string,
        description: test.description as string | null,
        questions: test.questions as { text: string; options?: { label: string; score: number; }[] | undefined }[],
        slug: test.slug as string,
        psychologist_id: test.psychologist_id as string,
        created_at: test.created_at as string,
        is_active: test.is_active as boolean,
        is_public: test.is_public as boolean,
        author: Array.isArray(test.author) ? test.author[0] ?? null : test.author ?? null,
      }
    })
  }

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between pl-10 md:pl-0">
          <div>
            <h2 className="font-serif text-xl">Topluluk Test Havuzu</h2>
            <p className="text-xs text-muted mt-0.5">
              Meslektaşlarınızın paylaştığı testleri keşfedin ve klonlayın
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sage inline-block" />
              {publicTests?.length ?? 0} test havuzda
            </span>
            {(myPublicCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                {myPublicCount} testiniz paylaşılıyor
              </span>
            )}
          </div>
        </div>
      </header>

      <CommunityClient
        publicTests={normalizePublicTests(publicTests as unknown[])}
        myPublicCount={myPublicCount ?? 0}
        currentUserId={user.id}
      />
    </>
  )
}
