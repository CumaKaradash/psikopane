'use client'
// components/panel/QuizApp.tsx — Düzeltildi: yeni soru formu ayrıldı, skor alanları eklendi

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

interface Option {
  label: string
  score: number
}

interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'text' | 'scale' | 'true_false'
  options: Option[]
}

interface Props {
  testId: string
  initialQuestions?: Question[]
  onSave: (questions: Question[]) => void
  onClose: () => void
}

type QType = Question['type']

const TYPE_LABELS: Record<QType, string> = {
  multiple_choice: 'Çoktan Seçmeli',
  text:            'Açık Uçlu Metin',
  scale:           'Ölçekli (0–10)',
  true_false:      'Doğru / Yanlış',
}

function defaultOptions(type: QType): Option[] {
  if (type === 'true_false') return [{ label: 'Doğru', score: 1 }, { label: 'Yanlış', score: 0 }]
  if (type === 'scale') return Array.from({ length: 11 }, (_, i) => ({ label: String(i), score: i }))
  if (type === 'multiple_choice') return [{ label: '', score: 1 }, { label: '', score: 0 }]
  return []
}

const emptyNewQ = (): { text: string; type: QType; options: Option[] } => ({
  text: '', type: 'multiple_choice', options: defaultOptions('multiple_choice'),
})

export default function QuizApp({ initialQuestions = [], onSave, onClose }: Props) {
  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions.map(q => ({ ...q, options: (q.options ?? []) as Option[] }))
  )
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [newQ,      setNewQ]      = useState(emptyNewQ())
  const [adding,    setAdding]    = useState(false)

  function updateEdit(field: keyof Question, value: Question[keyof Question]) {
    if (editIndex === null) return
    setQuestions(qs => qs.map((q, i) => i === editIndex ? { ...q, [field]: value } : q))
  }

  function updateEditOption(oi: number, field: keyof Option, value: string | number) {
    if (editIndex === null) return
    const opts = [...(questions[editIndex].options ?? [])]
    opts[oi] = { ...opts[oi], [field]: field === 'score' ? Number(value) : value }
    updateEdit('options', opts)
  }

  function changeEditType(type: QType) {
    if (editIndex === null) return
    setQuestions(qs => qs.map((q, i) =>
      i === editIndex ? { ...q, type, options: defaultOptions(type) } : q
    ))
  }

  function deleteQuestion(i: number) {
    setQuestions(qs => qs.filter((_, idx) => idx !== i))
    if (editIndex === i) setEditIndex(null)
    else if (editIndex !== null && editIndex > i) setEditIndex(editIndex - 1)
  }

  function handleAddQuestion() {
    if (!newQ.text.trim()) { toast.error('Soru metni boş olamaz'); return }
    const q: Question = { id: Date.now().toString(), ...newQ }
    const next = questions.length
    setQuestions(qs => [...qs, q])
    setEditIndex(next)
    setNewQ(emptyNewQ())
    setAdding(false)
  }

  function changeNewType(type: QType) {
    setNewQ(n => ({ ...n, type, options: defaultOptions(type) }))
  }

  function updateNewOption(oi: number, field: keyof Option, value: string | number) {
    const opts = [...newQ.options]
    opts[oi] = { ...opts[oi], [field]: field === 'score' ? Number(value) : value }
    setNewQ(n => ({ ...n, options: opts }))
  }

  function saveQuestions() {
    if (questions.length === 0) { toast.error('En az bir soru ekleyin'); return }
    const empty = questions.findIndex(q => !q.text.trim())
    if (empty !== -1) { toast.error(`${empty + 1}. sorunun metni boş`); return }
    onSave(questions)
    onClose()
    toast.success('Sorular kaydedildi!')
  }

  const editQ = editIndex !== null ? questions[editIndex] : null

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl">

        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold">Soru Oluşturucu</h3>
            <p className="text-xs text-muted mt-0.5">{questions.length} soru eklendi</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveQuestions} disabled={questions.length === 0}
              className="btn-primary disabled:opacity-60 text-sm py-2 px-4">
              Kaydet ({questions.length})
            </button>
            <button onClick={onClose} className="text-muted text-2xl leading-none hover:text-charcoal">×</button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Soru listesi */}
          <div className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-cream/40 overflow-y-auto">
            <div className="p-3 space-y-1">
              {questions.map((q, i) => (
                <div key={q.id}
                  onClick={() => { setEditIndex(i); setAdding(false) }}
                  className={`flex items-start gap-2 p-2.5 rounded-lg cursor-pointer group transition-colors
                    ${editIndex === i && !adding ? 'bg-white border border-sage-l shadow-sm' : 'hover:bg-white/60'}`}>
                  <span className="text-[10px] font-bold text-sage mt-0.5 flex-shrink-0 w-4 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-charcoal">
                      {q.text || <span className="italic text-muted">Boş soru</span>}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">{TYPE_LABELS[q.type]}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteQuestion(i) }}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 flex-shrink-0 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 mt-auto border-t border-border">
              <button onClick={() => { setAdding(true); setEditIndex(null) }}
                className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1">
                <Plus size={13} /> Yeni Soru
              </button>
            </div>
          </div>

          {/* Form alanı */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Yeni soru formu */}
            {adding && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-charcoal">Yeni Soru Ekle</h4>

                <div>
                  <label className="label">Soru Metni *</label>
                  <textarea className="input w-full resize-none" rows={3}
                    placeholder="Sorunuzu buraya yazın…"
                    value={newQ.text}
                    onChange={e => setNewQ(n => ({ ...n, text: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Soru Türü</label>
                  <select className="input" value={newQ.type}
                    onChange={e => changeNewType(e.target.value as QType)}>
                    {(Object.entries(TYPE_LABELS) as [QType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                {newQ.type !== 'text' && (
                  <div>
                    <label className="label">Seçenekler & Puanlar</label>
                    <div className="space-y-2">
                      {newQ.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input className="input flex-1" placeholder={`Seçenek ${oi + 1}`}
                            value={opt.label}
                            readOnly={newQ.type === 'scale' || newQ.type === 'true_false'}
                            onChange={e => updateNewOption(oi, 'label', e.target.value)} />
                          <div className="relative w-24 flex-shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none">puan</span>
                            <input className="input pl-11 text-right" type="number"
                              value={opt.score}
                              readOnly={newQ.type === 'scale'}
                              onChange={e => updateNewOption(oi, 'score', Number(e.target.value))} />
                          </div>
                          {newQ.type === 'multiple_choice' && newQ.options.length > 2 && (
                            <button onClick={() => setNewQ(n => ({ ...n, options: n.options.filter((_, j) => j !== oi) }))}
                              className="text-muted hover:text-red-500 flex-shrink-0">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {newQ.type === 'multiple_choice' && (
                        <button onClick={() => setNewQ(n => ({ ...n, options: [...n.options, { label: '', score: 0 }] }))}
                          className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1">
                          <Plus size={12} /> Seçenek Ekle
                        </button>
                      )}
                      {newQ.type === 'scale' && (
                        <p className="text-[11px] text-muted">Ölçekli sorularda 0–10 seçenekleri otomatik ayarlanır.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={handleAddQuestion} className="btn-primary flex items-center gap-1.5">
                    <Plus size={14} /> Soruyu Ekle
                  </button>
                  <button onClick={() => setAdding(false)} className="btn-outline">İptal</button>
                </div>
              </div>
            )}

            {/* Mevcut soru düzenleme */}
            {editQ && editIndex !== null && !adding && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-charcoal">{editIndex + 1}. Soruyu Düzenle</h4>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditIndex(Math.max(0, editIndex - 1))}
                      disabled={editIndex === 0} className="btn-outline py-1 px-2 text-xs disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setEditIndex(Math.min(questions.length - 1, editIndex + 1))}
                      disabled={editIndex === questions.length - 1} className="btn-outline py-1 px-2 text-xs disabled:opacity-40">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Soru Metni *</label>
                  <textarea className="input w-full resize-none" rows={3}
                    value={editQ.text}
                    onChange={e => updateEdit('text', e.target.value)} />
                </div>

                <div>
                  <label className="label">Soru Türü</label>
                  <select className="input" value={editQ.type}
                    onChange={e => changeEditType(e.target.value as QType)}>
                    {(Object.entries(TYPE_LABELS) as [QType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                {editQ.type !== 'text' && (
                  <div>
                    <label className="label">Seçenekler & Puanlar</label>
                    <div className="space-y-2">
                      {(editQ.options ?? []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input className="input flex-1" placeholder={`Seçenek ${oi + 1}`}
                            value={opt.label}
                            readOnly={editQ.type === 'scale' || editQ.type === 'true_false'}
                            onChange={e => updateEditOption(oi, 'label', e.target.value)} />
                          <div className="relative w-24 flex-shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none">puan</span>
                            <input className="input pl-11 text-right" type="number"
                              value={opt.score}
                              readOnly={editQ.type === 'scale'}
                              onChange={e => updateEditOption(oi, 'score', Number(e.target.value))} />
                          </div>
                          {editQ.type === 'multiple_choice' && (editQ.options?.length ?? 0) > 2 && (
                            <button onClick={() => updateEdit('options', (editQ.options ?? []).filter((_, j) => j !== oi))}
                              className="text-muted hover:text-red-500 flex-shrink-0">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {editQ.type === 'multiple_choice' && (
                        <button onClick={() => updateEdit('options', [...(editQ.options ?? []), { label: '', score: 0 }])}
                          className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1">
                          <Plus size={12} /> Seçenek Ekle
                        </button>
                      )}
                      {editQ.type === 'scale' && (
                        <p className="text-[11px] text-muted">Ölçekli sorularda 0–10 seçenekleri otomatik ayarlanır.</p>
                      )}
                    </div>
                  </div>
                )}

                <button onClick={() => deleteQuestion(editIndex)}
                  className="btn-outline text-red-500 border-red-200 hover:bg-red-50 text-xs flex items-center gap-1.5 py-1.5 px-3">
                  <Trash2 size={13} /> Bu Soruyu Sil
                </button>
              </div>
            )}

            {/* Boş durum */}
            {!adding && editQ === null && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <p className="text-sm text-muted mb-4">
                  {questions.length === 0
                    ? 'Henüz soru eklenmedi. Başlamak için "Yeni Soru" butonuna tıklayın.'
                    : 'Düzenlemek için sol taraftan bir soru seçin.'}
                </p>
                <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5">
                  <Plus size={14} /> Yeni Soru Ekle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
