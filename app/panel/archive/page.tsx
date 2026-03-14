// app/panel/archive/page.tsx — Mobil responsive tablolar

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { redirect } from 'next/navigation'

export default async function ArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: ownTests }, { data: ownHw }, { data: clients }] = await Promise.all([
    supabase.from('tests').select('id, title, slug').eq('psychologist_id', user.id),
    supabase.from('homework').select('id, title, slug').eq('psychologist_id', user.id),
    supabase.from('clients').select('id, full_name, created_at, status').eq('psychologist_id', user.id).order('full_name'),
  ])

  const testIds = (ownTests ?? []).map(t => t.id)
  const hwIds   = (ownHw   ?? []).map(h => h.id)

  const [{ data: testResponses }, { data: hwResponses }] = await Promise.all([
    testIds.length > 0
      ? supabase.from('test_responses').select('*').in('test_id', testIds).order('completed_at', { ascending: false }).limit(100)
      : Promise.resolve({ data: [] }),
    hwIds.length > 0
      ? supabase.from('homework_responses').select('*').in('homework_id', hwIds).order('completed_at', { ascending: false }).limit(100)
      : Promise.resolve({ data: [] }),
  ])

  const testMap = Object.fromEntries((ownTests ?? []).map(t => [t.id, t.title]))
  const hwMap   = Object.fromEntries((ownHw   ?? []).map(h => [h.id, h.title]))

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <h2 className="font-serif text-xl pl-10 md:pl-0">Arşiv</h2>
      </header>

      <div className="p-4 md:p-6 space-y-6">

        {/* Test Yanıtları */}
        <div className="card">
          <div className="px-4 md:px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Test Sonuçları</h3>
            <p className="text-xs text-muted mt-0.5">{testResponses?.length ?? 0} yanıt</p>
          </div>
          {!testResponses?.length ? (
            <p className="px-6 py-10 text-center text-sm text-muted">Henüz test yanıtı yok</p>
          ) : (
            /* Yatay kaydırma — mobil için */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-cream">
                    {['Test', 'Yanıtlayan', 'Skor', 'Tarih'].map(h => (
                      <th key={h} className="px-4 md:px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testResponses.map(r => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-cream/40 transition-colors">
                      <td className="px-4 md:px-5 py-3 text-sm font-medium max-w-[160px] truncate">{testMap[r.test_id] ?? '—'}</td>
                      <td className="px-4 md:px-5 py-3 text-sm text-muted">{r.respondent_name ?? 'Anonim'}</td>
                      <td className="px-4 md:px-5 py-3">
                        {r.total_score !== null
                          ? <span className="pill-sage">{r.total_score} puan</span>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td className="px-4 md:px-5 py-3 text-xs text-muted whitespace-nowrap">
                        {format(new Date(r.completed_at), 'd MMM yyyy HH:mm', { locale: tr })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ödev Yanıtları */}
        <div className="card">
          <div className="px-4 md:px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Ödev Yanıtları</h3>
            <p className="text-xs text-muted mt-0.5">{hwResponses?.length ?? 0} yanıt</p>
          </div>
          {!hwResponses?.length ? (
            <p className="px-6 py-10 text-center text-sm text-muted">Henüz ödev yanıtı yok</p>
          ) : (
            <ul>
              {hwResponses.map(r => (
                <li key={r.id} className="px-4 md:px-6 py-4 border-b border-border/60 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{hwMap[r.homework_id] ?? '—'}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {r.respondent_name ?? 'Anonim'} · {format(new Date(r.completed_at), 'd MMM yyyy HH:mm', { locale: tr })}
                      </p>
                    </div>
                    <span className="pill-green flex-shrink-0">Tamamlandı</span>
                  </div>
                  {Array.isArray(r.answers) && r.answers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {(r.answers as { question_index: number; answer_text: string }[]).map((a, i) => (
                        <div key={i} className="bg-cream rounded-lg px-3 md:px-4 py-2.5">
                          <p className="text-xs font-semibold text-muted mb-1">Soru {a.question_index + 1}</p>
                          <p className="text-sm">{a.answer_text || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Danışan Kaydı */}
        <div className="card">
          <div className="px-4 md:px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Danışan Kaydı</h3>
            <p className="text-xs text-muted mt-0.5">{clients?.length ?? 0} danışan</p>
          </div>
          {!clients?.length ? (
            <p className="px-6 py-10 text-center text-sm text-muted">Henüz danışan yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[360px]">
                <thead>
                  <tr className="bg-cream">
                    {['Ad Soyad', 'Durum', 'Kayıt Tarihi'].map(h => (
                      <th key={h} className="px-4 md:px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-cream/40 transition-colors">
                      <td className="px-4 md:px-5 py-3 text-sm font-medium">{c.full_name}</td>
                      <td className="px-4 md:px-5 py-3">
                        <span className={c.status === 'active' ? 'pill-green' : c.status === 'new' ? 'pill-blue' : 'pill-orange'}>
                          {c.status === 'active' ? 'Aktif' : c.status === 'new' ? 'Yeni' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-3 text-xs text-muted whitespace-nowrap">
                        {format(new Date(c.created_at), 'd MMM yyyy', { locale: tr })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
