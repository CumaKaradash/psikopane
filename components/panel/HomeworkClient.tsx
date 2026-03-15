'use client'
// components/panel/HomeworkClient.tsx
// DÜZELTME: response_count → responses key düzeltildi, delete eklendi

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Homework } from '@/lib/types'

type HomeworkWithCount = Homework & { responses?: { count: number }[] }

interface Props {
  homework: HomeworkWithCount[]
  profileSlug: string
}

function toSlug(text: string) {
  return text.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
}

export default function HomeworkClient({ homework: initial, profileSlug }: Props) {
  const [homework, setHomework] = useState(initial)
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<string[]>([''])
  const [form, setForm] = useState({ title: '', slug: '', description: '', due_date: '' })

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function copyUrl(hwSlug: string) {
    navigator.clipboard.writeText(`${baseUrl}/${profileSlug}/odev/${hwSlug}`)
    toast.success('Link kopyalandı!')
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch('/api/homework', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    if (res.ok) {
      setHomework(hs => hs.map(h => h.id === id ? { ...h, is_active: !current } : h))
      toast.success(!current ? 'Ödev aktifleştirildi' : 'Ödev pasifleştirildi')
    } else {
      toast.error('Güncelleme başarısız')
    }
  }

  async function deleteHw(id: string) {
    if (!confirm('Bu ödevi silmek istediğinize emin misiniz?')) return
    const res = await fetch(`/api/homework?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setHomework(hs => hs.filter(h => h.id !== id))
      toast.success('Ödev silindi')
    } else {
      toast.error('Silme başarısız')
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.slug) { toast.error('Başlık ve URL zorunlu'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          description: form.description || null,
          questions: questions.filter(q => q.trim()).map(text => ({ text })),
          due_date: form.due_date || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const hw: HomeworkWithCount = await res.json()
      setHomework(h => [hw, ...h])
      setAddOpen(false)
      setForm({ title: '', slug: '', description: '', due_date: '' })
      setQuestions([''])
      toast.success('Ödev oluşturuldu!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-end mb-5">
        <button onClick={() => setAddOpen(true)} className="btn-accent">+ Yeni Ödev</button>
      </div>

      {homework.length === 0 && (
        <div className="text-center py-16 text-muted text-sm">
          Henüz ödev yok.{' '}
          <button onClick={() => setAddOpen(true)} className="text-accent hover:underline">İlk ödevi oluştur →</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {homework.map(hw => {
          const count  = hw.responses?.[0]?.count ?? 0
          const hasQ   = hw.questions && hw.questions.length > 0
          return (
            <div key={hw.id} className="card p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold leading-snug flex-1 pr-2">{hw.title}</h4>
                <span className={hw.is_active ? 'pill-green' : 'pill-orange'}>
                  {hw.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <p className="text-xs text-muted mb-1">
                {hasQ ? `${hw.questions.length} soru` : 'Metin ödevi'} · {count} yanıt
              </p>
              {hw.due_date && (
                <p className="text-xs text-accent font-semibold mb-2">
                  Son: {new Date(hw.due_date).toLocaleDateString('tr-TR')}
                </p>
              )}
              <div className="bg-cream rounded-lg px-3 py-1.5 font-mono text-xs text-sage mb-3 truncate">
                {profileSlug}/odev/{hw.slug}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => copyUrl(hw.slug)}
                  className="btn-outline py-1 px-2.5 text-xs">📋 Kopyala</button>
                <a href={`/panel/homework/responses/${hw.id}`}
                  className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1">
                  👁 Yanıtları Gör {count > 0 && <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{count}</span>}
                </a>
                <button onClick={() => toggleActive(hw.id, hw.is_active)}
                  className="btn-outline py-1 px-2.5 text-xs">
                  {hw.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                </button>
                <button onClick={() => deleteHw(hw.id)}
                  className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors">Sil</button>
              </div>
            </div>
          )
        })}

        <button onClick={() => setAddOpen(true)}
          className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-colors min-h-[160px]">
          <span className="text-3xl">+</span>
          <span className="text-sm font-medium">Yeni Ödev</span>
        </button>
      </div>

      {addOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-lg my-4">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Yeni Ödev Oluştur</h3>
              <button onClick={() => setAddOpen(false)} className="text-muted text-xl leading-none hover:text-charcoal">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">Ödev Başlığı *</label>
                <input className="input" required placeholder="ör. Düşünce Günlüğü"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: toSlug(e.target.value) }))} />
              </div>
              <div>
                <label className="label">URL Kısaltması *</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted whitespace-nowrap font-mono">{profileSlug}/odev/</span>
                  <input className="input font-mono" required placeholder="dusunce-gunlugu"
                    value={form.slug} onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="label">Talimat / Açıklama</label>
                <textarea className="input resize-none" rows={3} placeholder="Danışana gösterilecek yönerge…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Son Tarih (opsiyonel)</label>
                <input className="input" type="date"
                  value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Sorular (opsiyonel)</label>
                {questions.map((q, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className="input flex-1" placeholder={`Soru ${i + 1}`}
                      value={q} onChange={e => {
                        const next = [...questions]; next[i] = e.target.value; setQuestions(next)
                      }} />
                    {questions.length > 1 && (
                      <button type="button"
                        onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))}
                        className="text-muted hover:text-red-500 text-lg leading-none px-1">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setQuestions(qs => [...qs, ''])}
                  className="text-xs text-sage hover:underline">+ Soru ekle</button>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddOpen(false)} className="btn-outline flex-1 justify-center">İptal</button>
                <button type="submit" disabled={loading} className="btn-accent flex-1 justify-center disabled:opacity-60">
                  {loading ? 'Oluşturuluyor…' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
