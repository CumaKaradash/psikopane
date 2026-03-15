// app/panel/homework/responses/[hwId]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, User, Calendar, MessageSquare, ClipboardList } from 'lucide-react'

interface Answer {
  question_index: number
  answer_text: string
}

interface HomeworkResponse {
  id: string
  respondent_name: string | null
  answers: Answer[]
  completed_at: string
}

interface HomeworkWithResponses {
  id: string
  title: string
  description: string | null
  questions: { text: string }[]
  due_date: string | null
  is_active: boolean
  homework_responses: HomeworkResponse[]
}

export default async function HomeworkResponsesPage({
  params,
}: {
  params: Promise<{ hwId: string }>
}) {
  const { hwId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: hw, error } = await supabase
    .from('homework')
    .select(`
      id, title, description, questions, due_date, is_active,
      homework_responses (
        id, respondent_name, answers, completed_at
      )
    `)
    .eq('id', hwId)
    .eq('psychologist_id', user.id)
    .single()

  if (error || !hw) notFound()

  const homework = hw as unknown as HomeworkWithResponses
  const responses = homework.homework_responses ?? []
  const hasQuestions = homework.questions && homework.questions.length > 0

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 pl-10 md:pl-0">
          <Link
            href="/panel/homework"
            className="p-1.5 rounded-lg hover:bg-cream transition-colors text-muted hover:text-charcoal"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="font-serif text-xl leading-tight">{homework.title}</h2>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
              <span className={homework.is_active ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
                {homework.is_active ? '● Aktif' : '● Pasif'}
              </span>
              <span>·</span>
              <span>{responses.length} yanıt</span>
              {homework.due_date && (
                <>
                  <span>·</span>
                  <span>Son: {new Date(homework.due_date).toLocaleDateString('tr-TR')}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {homework.description && (
          <div className="card p-4 mb-6 bg-cream/60">
            <p className="text-sm text-muted leading-relaxed">{homework.description}</p>
          </div>
        )}

        {responses.length === 0 ? (
          <div className="card py-20 text-center">
            <ClipboardList size={36} className="mx-auto text-muted opacity-30 mb-3" />
            <p className="text-sm font-medium text-muted">Henüz yanıt gönderilmemiş.</p>
            <p className="text-xs text-muted mt-1">
              Danışanlarınız formu doldurduğunda burada görünecek.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((r, idx) => (
              <div key={r.id} className="card overflow-hidden">
                {/* Response header */}
                <div className="px-5 py-3.5 border-b border-border bg-cream/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {r.respondent_name
                        ? r.respondent_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        : '#' + (idx + 1)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-charcoal">
                        {r.respondent_name ?? `Anonim Yanıt #${idx + 1}`}
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
                  <span className="text-xs text-muted bg-white border border-border px-2.5 py-1 rounded-full flex-shrink-0">
                    {r.answers?.length ?? 0} cevap
                  </span>
                </div>

                {/* Answers */}
                <div className="p-5 space-y-4">
                  {hasQuestions ? (
                    homework.questions.map((q, qi) => {
                      const ans = r.answers?.find((a: Answer) => a.question_index === qi)
                      return (
                        <div key={qi}>
                          <p className="text-xs font-semibold text-muted mb-1.5 flex items-start gap-1.5">
                            <span className="text-sage font-bold flex-shrink-0">{qi + 1}.</span>
                            {q.text}
                          </p>
                          <div className="bg-cream rounded-lg px-4 py-3">
                            <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">
                              {ans?.answer_text ?? <span className="italic text-muted">— Yanıtlanmadı</span>}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    /* Metin ödevi — tek cevap */
                    r.answers?.map((a: Answer, ai: number) => (
                      <div key={ai}>
                        <p className="text-xs font-semibold text-muted mb-1.5 flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-sage" />
                          Danışan Yanıtı
                        </p>
                        <div className="bg-cream rounded-lg px-4 py-3">
                          <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">
                            {a.answer_text}
                          </p>
                        </div>
                      </div>
                    ))
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
