// app/[slug]/test/[testId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TestRunner from '@/components/client/TestRunner'
import { FlaskConical } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string; testId: string }>
}

export default async function TestPage({ params: rawParams }: Props) {
  const { slug, testId: testIdParam } = await rawParams
  const supabase = await createClient()

  // Psikolog slug'ını doğrula
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, slug')
    .eq('slug', slug)
    .single()

  if (!profile) notFound()

  // Test'i slug ile bul (is_active filtresi yok)
  const { data: test } = await supabase
    .from('tests')
    .select('*')
    .eq('psychologist_id', profile.id)
    .eq('slug', testIdParam)
    .single()

  // Test hiç yoksa gerçek 404
  if (!test) notFound()

  // Test pasifleştirilmişse buton içermeyen bilgi ekranı
  if (!test.is_active) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sage-pale via-cream to-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center mx-auto mb-6">
            <FlaskConical size={28} className="text-muted opacity-40" />
          </div>
          <h1 className="font-serif text-2xl text-charcoal mb-3">Test Şu An Aktif Değil</h1>
          <p className="text-sm text-muted leading-relaxed">
            Bu test psikologunuz tarafından geçici olarak devre dışı bırakılmıştır.
            Psikologunuzla iletişime geçebilirsiniz.
          </p>
          <p className="text-xs text-muted mt-8 opacity-50">Powered by PsikoPanel</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sage-pale via-cream to-white py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-mono text-muted mb-2">
            {profile.slug}/test/{test.slug}
          </p>
          <h1 className="font-serif text-2xl">{test.title}</h1>
          {test.description && (
            <p className="text-sm text-muted mt-2">{test.description}</p>
          )}
          <p className="text-xs text-muted mt-1">
            {profile.full_name} tarafından gönderildi · Üye olmak gerekmez
          </p>
        </div>
        <TestRunner test={test} psychologistId={profile.id} />
      </div>
    </main>
  )
}
