// app/[slug]/test/[testId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TestRunner from '@/components/client/TestRunner'

interface Props {
  params: { slug: string; testId: string }
}

export default async function TestPage({ params }: Props) {
  const supabase = await createClient()

  // Psikolog slug'ını doğrula
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, slug')
    .eq('slug', params.slug)
    .single()

  if (!profile) notFound()

  // Test'i bul
  const { data: test } = await supabase
    .from('tests')
    .select('*')
    .eq('psychologist_id', profile.id)
    .eq('slug', params.testId)
    .eq('is_active', true)
    .single()

  if (!test) notFound()

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
