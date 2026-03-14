'use client'
// components/client/HomeworkForm.tsx

import { useState } from 'react'
import type { Homework } from '@/lib/types'

interface Props { homework: Homework }

export default function HomeworkForm({ homework }: Props) {
  const [answers, setAnswers] = useState<string[]>(
    (homework.questions || []).map(() => '')
  )
  const [name, setName] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const hasQuestions = homework.questions && homework.questions.length > 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/homework/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homework_id: homework.id,
          respondent_name: name || null,
          answers: hasQuestions
            ? homework.questions.map((q, i) => ({ question_index: i, answer_text: answers[i] }))
            : [],
        }),
      })
    } catch { /* silent */ }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-serif text-2xl mb-2">Ödeviniz Teslim Edildi!</h2>
        <p className="text-sm text-muted leading-relaxed">
          Psikologunuz cevaplarınızı inceleyecek.<br />
          Bir sonraki seansta birlikte değerlendireceğiz.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {homework.description && (
        <div className="card p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Bu Haftaki Ödeviniz</p>
          <p className="text-sm leading-relaxed text-charcoal whitespace-pre-line">{homework.description}</p>
        </div>
      )}

      {/* İsim — tek seferlik */}
      <div className="card p-5">
        <label className="label">Adınız (opsiyonel)</label>
        <input className="input" placeholder="Adınız" value={name}
          onChange={e => setName(e.target.value)} />
      </div>

      {hasQuestions && homework.questions.map((q, i) => (
        <div key={i} className="card p-5">
          <p className="text-xs font-bold text-accent uppercase tracking-wide mb-2">Soru {i + 1}</p>
          <p className="text-sm font-medium mb-3 leading-relaxed">{q.text}</p>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Cevabınızı buraya yazın…"
            value={answers[i]}
            onChange={e => {
              const next = [...answers]
              next[i] = e.target.value
              setAnswers(next)
            }}
          />
        </div>
      ))}

      <button type="submit" disabled={loading}
        className="btn-accent w-full justify-center py-3 text-sm font-semibold disabled:opacity-50">
        {loading ? 'Gönderiliyor…' : hasQuestions ? 'Ödevi Gönder →' : 'Tamamladım ✓'}
      </button>
      <p className="text-center text-xs text-muted">
        Cevaplarınız yalnızca psikologunuzla paylaşılır
      </p>
    </form>
  )
}
