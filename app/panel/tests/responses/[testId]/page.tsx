// app/panel/tests/responses/[testId]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Calendar, ClipboardList, BarChart2, User } from 'lucide-react'

interface Answer {
  question_index: number
  option_index:   number
  score:          number
}

interface TestResponse {
  id:              string
  respondent_name: string | null
  answers:         Answer[]
  total_score:     number | null
  completed_at:    string
}

interface TestOption {
  label: string
  score: number
}

interface TestQuestion {
  text:    string
  options: TestOption[]
}

interface TestWithResponses {
  id:             string
  title:          string
  description:    string | null
  questions:      TestQuestion[]
  is_active:      boolean
  is_public:      boolean
  test_responses: TestResponse[]
}

export default async function TestResponsesPage({
  params,
}: {
  params: { testId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: test, error } = await supabase
    .from('tests')
    .select(`
      id, title, description, questions, is_active, is_public,
      test_responses (
        id, respondent_name, answers, total_score, completed_at
      )
    `)
    .eq('id', params.testId)
    .eq('psychologist_id', user.id)
    .single()

  if (error || !test) notFound()

  const t = test as unknown as TestWithResponses
  const responses = t.test_responses ?? []
  const hasQuestions = t.questions && t.questions.length > 0

  // Score stats
  const scoredResponses = responses.filter(r => r.total_score !== null)
  const avgScore = scoredResponses.length > 0
    ? Math.round(scoredResponses.reduce((s, r) => s + (r.total_score ?? 0), 0) / scoredResponses.length)
    : null
  const maxPossible = hasQuestions
    ? t.questions.reduce((sum, q) => sum + Math.max(...(q.options?.map(o => o.score) ?? [0])), 0)
    : null

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 pl-10 md:pl-0">
          <Link
            href="/panel/tests"
            className="p-1.5 rounded-lg hover:bg-cream transition-colors text-muted hover:text-charcoal"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="font-serif text-xl leading-tight">{t.title}</h2>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
              <span className={t.is_active ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
                {t.is_active ? '● Aktif' : '● Pasif'}
              </span>
              <span>·</span>
              <span>{responses.length} yanıt</span>
              {hasQuestions && (
                <>
                  <span>·</span>
                  <span>{t.questions.length} soru</span>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-4xl mx-auto">

        {/* Stats bar */}
        {responses.length > 0 && avgScore !== null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-charcoal">{responses.length}</p>
              <p className="text-xs text-muted mt-0.5">Toplam Yanıt</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-sage">{avgScore}</p>
              <p className="text-xs text-muted mt-0.5">
                Ortalama Puan {maxPossible ? `/ ${maxPossible}` : ''}
              </p>
            </div>
            <div className="card p-4 text-center sm:col-span-1 col-span-2">
              <p className="text-2xl font-bold text-accent">
                {Math.max(...scoredResponses.map(r => r.total_score ?? 0))}
              </p>
              <p className="text-xs text-muted mt-0.5">En Yüksek Puan</p>
            </div>
          </div>
        )}

        {t.description && (
          <div className="card p-4 mb-6 bg-cream/60">
            <p className="text-sm text-muted leading-relaxed">{t.description}</p>
          </div>
        )}

        {responses.length === 0 ? (
          <div className="card py-20 text-center">
            <ClipboardList size={36} className="mx-auto text-muted opacity-30 mb-3" />
            <p className="text-sm font-medium text-muted">Henüz yanıt gönderilmemiş.</p>
            <p className="text-xs text-muted mt-1">
              Danışanlarınız testi tamamladığında burada görünecek.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((r, idx) => (
              <div key={r.id} className="card overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-border bg-cream/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {r.respondent_name
                        ? r.respondent_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        : '#' + (idx + 1)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-charcoal">
                        {r.respondent_name ?? `Anonim Katılımcı #${idx + 1}`}
                      </p>
                      <p className="text-xs text-muted flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(r.completed_at).toLocaleString('tr-TR', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  {r.total_score !== null && (
                    <div className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-3 py-1.5 flex-shrink-0">
                      <BarChart2 size={13} className="text-sage" />
                      <span className="text-sm font-bold text-charcoal">{r.total_score}</span>
                      {maxPossible && (
                        <span className="text-xs text-muted">/ {maxPossible}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Answers */}
                <div className="p-5 space-y-4">
                  {hasQuestions ? (
                    t.questions.map((q, qi) => {
                      const ans = r.answers?.find((a: Answer) => a.question_index === qi)
                      const selectedOption = ans !== undefined ? q.options?.[ans.option_index] : null
                      return (
                        <div key={qi}>
                          <p className="text-xs font-semibold text-muted mb-2 flex items-start gap-1.5">
                            <span className="text-sage font-bold flex-shrink-0">{qi + 1}.</span>
                            {q.text}
                          </p>
                          {q.options && q.options.length > 0 ? (
                            <div className="grid grid-cols-1 gap-1.5">
                              {q.options.map((opt, oi) => {
                                const isSelected = ans?.option_index === oi
                                return (
                                  <div
                                    key={oi}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                                      ${isSelected
                                        ? 'bg-sage text-white font-medium'
                                        : 'bg-cream text-muted'}`}
                                  >
                                    <span>{opt.label}</span>
                                    {isSelected && (
                                      <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                                        {opt.score} puan
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="bg-cream rounded-lg px-4 py-3">
                              <p className="text-sm text-charcoal">
                                {selectedOption?.label ?? <span className="italic text-muted">— Yanıtlanmadı</span>}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted italic">Bu test için soru tanımlanmamış.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
