'use client'
// components/client/TestRunner.tsx

import { useState } from 'react'
import type { Test } from '@/lib/types'

interface Props {
  test: Test
  psychologistId: string
}

export default function TestRunner({ test }: Props) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<{ question_index: number; option_index: number; score: number }[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [name, setName] = useState('')
  const [nameSubmitted, setNameSubmitted] = useState(false)

  const total = test.questions.length
  const progress = total > 0 ? Math.round((currentQ / total) * 100) : 0

  function next() {
    if (selected === null) return
    const score = test.questions[currentQ].options[selected].score
    const newAnswers = [...answers, { question_index: currentQ, option_index: selected, score }]
    setAnswers(newAnswers)
    setSelected(null)

    if (currentQ + 1 >= total) {
      submitTest(newAnswers)
    } else {
      setCurrentQ(q => q + 1)
    }
  }

  async function submitTest(finalAnswers: typeof answers) {
    const score = finalAnswers.reduce((sum, a) => sum + a.score, 0)
    setTotalScore(score)
    try {
      await fetch('/api/tests/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: test.id,
          respondent_name: name || null,
          answers: finalAnswers,
          total_score: score,
        }),
      })
    } catch { /* silent — result still shown */ }
    setDone(true)
  }

  function getInterpretation(score: number) {
    if (score <= 9)  return { label: 'Minimal', color: 'text-green-700',  bg: 'bg-green-50'  }
    if (score <= 16) return { label: 'Hafif',   color: 'text-yellow-700', bg: 'bg-yellow-50' }
    if (score <= 23) return { label: 'Orta',    color: 'text-orange-700', bg: 'bg-orange-50' }
    return               { label: 'Ağır',    color: 'text-red-700',    bg: 'bg-red-50'    }
  }

  if (!nameSubmitted) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted mb-6">Teste başlamadan önce adınızı girin.</p>
        <input className="input mb-4" placeholder="Adınız (opsiyonel)"
          value={name} onChange={e => setName(e.target.value)} />
        <button className="btn-primary w-full justify-center py-3"
          onClick={() => setNameSubmitted(true)}>
          Testi Başlat
        </button>
      </div>
    )
  }

  if (done) {
    const interp = getInterpretation(totalScore)
    return (
      <div className="card p-8 text-center">
        <div className={`w-24 h-24 rounded-full ${interp.bg} border-4 border-sage flex flex-col items-center justify-center mx-auto mb-6`}>
          <span className="font-serif text-3xl text-sage">{totalScore}</span>
          <span className="text-[10px] text-sage font-bold uppercase tracking-wide">Puan</span>
        </div>
        <h2 className="font-serif text-2xl mb-2">Test Tamamlandı</h2>
        <p className="text-sm text-muted mb-6">Sonuçlarınız psikologunuza iletildi.</p>
        <div className={`${interp.bg} rounded-xl p-4`}>
          <div className={`text-xs font-bold ${interp.color} uppercase tracking-wide mb-1`}>Belirti Düzeyi</div>
          <div className={`text-lg font-semibold ${interp.color}`}>{interp.label}</div>
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="card p-8 text-center text-sm text-muted">
        Bu test henüz soru içermiyor.
      </div>
    )
  }

  const q = test.questions[currentQ]

  return (
    <div className="space-y-4">
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-sage rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-muted text-right">{currentQ + 1} / {total}</p>

      <div className="card p-6">
        <p className="text-xs font-bold text-sage uppercase tracking-wide mb-3">Soru {currentQ + 1}</p>
        <p className="text-base font-medium leading-relaxed mb-5">{q.text}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button key={i}
              onClick={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all
                ${selected === i
                  ? 'border-sage bg-sage-pale font-medium'
                  : 'border-border hover:border-sage hover:bg-sage-pale/50'}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                ${selected === i ? 'border-sage bg-sage' : 'border-border'}`}>
                {selected === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button onClick={next} disabled={selected === null}
        className="btn-primary w-full justify-center py-3 disabled:opacity-40">
        {currentQ + 1 === total ? 'Testi Tamamla →' : 'Devam →'}
      </button>
    </div>
  )
}
