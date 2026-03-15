// app/[slug]/odev/[odevId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import HomeworkForm from '@/components/client/HomeworkForm'
import { BookOpen } from 'lucide-react'

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

  // is_active filtresi kaldırıldı — pasif ödevler için bilgi ekranı gösterilecek
  const { data: homework } = await supabase
    .from('homework')
    .select('*')
    .eq('psychologist_id', profile.id)
    .eq('slug', odevId)
    .single()

  if (!homework) notFound()

  // Pasif ödev: teslim ekranı yerine bilgi ekranı göster
  if (!homework.is_active) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-accent-l via-cream to-sage-pale flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center mx-auto mb-6">
            <BookOpen size={28} className="text-muted opacity-40" />
          </div>
          <h1 className="font-serif text-2xl text-charcoal mb-3">Ödev Şu An Aktif Değil</h1>
          <p className="text-sm text-muted leading-relaxed">
            Bu ödev psikologunuz tarafından geçici olarak devre dışı bırakılmıştır.
            Psikologunuzla iletişime geçebilirsiniz.
          </p>
          <p className="text-xs text-muted mt-8 opacity-50">Powered by PsikoPanel</p>
        </div>
      </main>
    )
  }

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
