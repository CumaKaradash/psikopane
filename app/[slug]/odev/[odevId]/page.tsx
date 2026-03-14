// app/[slug]/odev/[odevId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import HomeworkForm from '@/components/client/HomeworkForm'

interface Props {
  params: Promise<{ slug: string; odevId: string }>
}

export default async function OdevPage({ params: rawParams }: Props) {
  const { slug, odevId } = await rawParams
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, slug')
    .eq('slug', slug)
    .single()

  if (!profile) notFound()

  const { data: homework } = await supabase
    .from('homework')
    .select('*')
    .eq('psychologist_id', profile.id)
    .eq('slug', odevId)
    .eq('is_active', true)
    .single()

  if (!homework) notFound()

  return (
    <main className="min-h-screen bg-gradient-to-br from-accent-l via-cream to-sage-pale py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-mono text-muted mb-2">
            {profile.slug}/odev/{homework.slug}
          </p>
          <h1 className="font-serif text-2xl">{homework.title}</h1>
          <p className="text-xs text-muted mt-1">
            {profile.full_name} tarafından verildi · Üye olmak gerekmez
          </p>
          {homework.due_date && (
            <p className="text-xs text-accent font-semibold mt-1">
              Son teslim: {new Date(homework.due_date).toLocaleDateString('tr-TR')}
            </p>
          )}
        </div>
        <HomeworkForm homework={homework} />
      </div>
    </main>
  )
}
