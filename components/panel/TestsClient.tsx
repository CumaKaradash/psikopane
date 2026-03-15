'use client'
// components/panel/TestsClient.tsx — JSON export/import + is_public toggle + QuizApp

import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Download, Upload, Globe, Lock } from 'lucide-react'
import type { Test } from '@/lib/types'
import QuizApp from '@/components/panel/QuizApp'

type TestWithCount = Test & {
  responses?: { count: number }[]
  is_public?: boolean
}

interface Props {
  tests:       TestWithCount[]
  profileSlug: string
}

function toSlug(text: string) {
  return text.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
}

export default function TestsClient({ tests: initial, profileSlug }: Props) {
  const [tests, setTests]     = useState(initial)
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm]       = useState({ title: '', slug: '', description: '', is_public: false })
  const [quizTestId, setQuizTestId] = useState<string | null>(null)
  const importRef             = useRef<HTMLInputElement>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function copyUrl(testSlug: string) {
    navigator.clipboard.writeText(`${baseUrl}/${profileSlug}/test/${testSlug}`)
    toast.success('Link kopyalandı!')
  }

  // ── JSON Dışa Aktar ───────────────────────────────────────────────────────
  function exportTest(test: TestWithCount) {
    const payload = {
      title:       test.title,
      description: test.description,
      questions:   test.questions,
      exported_at: new Date().toISOString(),
      source:      'psikopanel',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${test.slug}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Test JSON olarak indirildi')
  }

  // ── JSON İçe Aktar ────────────────────────────────────────────────────────
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        if (!json.title || !Array.isArray(json.questions)) {
          toast.error('Geçersiz JSON formatı')
          return
        }
        const slug = `${toSlug(json.title)}-${Date.now().toString(36)}`
        setLoading(true)
        const res = await fetch('/api/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:       json.title,
            description: json.description || null,
            questions:   json.questions,
            slug,
            is_public:   false,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const newTest: TestWithCount = await res.json()
        setTests(t => [newTest, ...t])
        toast.success(`"${json.title}" içe aktarıldı!`)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'JSON okunamadı')
      } finally {
        setLoading(false)
        if (importRef.current) importRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  // ── is_active toggle ──────────────────────────────────────────────────────
  async function toggleActive(id: string, current: boolean) {
    const res = await fetch('/api/tests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    if (res.ok) {
      setTests(ts => ts.map(t => t.id === id ? { ...t, is_active: !current } : t))
      toast.success(!current ? 'Aktifleştirildi' : 'Pasifleştirildi')
    } else toast.error('Güncelleme başarısız')
  }

  // ── is_public toggle ──────────────────────────────────────────────────────
  async function togglePublic(id: string, current: boolean) {
    const res = await fetch('/api/tests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_public: !current }),
    })
    if (res.ok) {
      setTests(ts => ts.map(t => t.id === id ? { ...t, is_public: !current } : t))
      toast.success(!current ? 'Toplulukta paylaşıldı' : 'Topluluktan kaldırıldı')
    } else toast.error('Güncelleme başarısız')
  }

  // ── Sil ──────────────────────────────────────────────────────────────────
  async function deleteTest(id: string) {
    if (!confirm('Bu testi silmek istediğinize emin misiniz?')) return
    const res = await fetch(`/api/tests?id=${id}`, { method: 'DELETE' })
    if (res.ok) { setTests(ts => ts.filter(t => t.id !== id)); toast.success('Silindi') }
    else toast.error('Silme başarısız')
  }

  // ── Yeni test ekle ────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.slug) { toast.error('Başlık ve URL zorunlu'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, slug: form.slug, description: form.description, questions: [], is_public: form.is_public }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const newTest: TestWithCount = await res.json()
      setTests(t => [newTest, ...t])
      setAddOpen(false)
      setForm({ title: '', slug: '', description: '', is_public: false })
      toast.success('Test oluşturuldu! Şimdi soru ekleyebilirsiniz.')
      // QuizApp'i otomatik aç
      setQuizTestId(newTest.id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5 justify-end">
        {/* Gizli import input */}
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        <button onClick={() => importRef.current?.click()}
          className="btn-outline flex items-center gap-1.5 text-xs">
          <Upload size={14} /> JSON ile İçe Aktar
        </button>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          + Yeni Test
        </button>
      </div>

      {tests.length === 0 && (
        <div className="text-center py-16 text-muted text-sm">
          Henüz test yok.{' '}
          <button onClick={() => setAddOpen(true)} className="text-sage hover:underline">İlk testi oluştur →</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tests.map(t => {
          const count = t.responses?.[0]?.count ?? 0
          return (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold leading-snug flex-1 pr-2">{t.title}</h4>
                <div className="flex gap-1 flex-shrink-0">
                  <span className={t.is_active ? 'pill-green' : 'pill-orange'}>
                    {t.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  {t.is_public && (
                    <span title="Toplulukta paylaşılıyor" className="pill-blue">🌐</span>
                  )}
                </div>
              </div>
              {t.description && <p className="text-xs text-muted mb-2 line-clamp-2">{t.description}</p>}
              <div className="bg-cream rounded-lg px-3 py-1.5 font-mono text-xs text-sage mb-2 truncate">
                {profileSlug}/test/{t.slug}
              </div>
              <p className="text-xs text-muted mb-3">{count} yanıt</p>

              <div className="flex flex-wrap items-center gap-1.5">
                <button onClick={() => copyUrl(t.slug)}    className="btn-outline py-1 px-2 text-xs">📋</button>
                <button onClick={() => exportTest(t)}
                  className="btn-outline py-1 px-2 text-xs flex items-center gap-1" title="JSON Dışa Aktar">
                  <Download size={11} />
                </button>
                <a href={`/panel/tests/responses/${t.id}`}
                  className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1">
                  👁 Yanıtları Gör {count > 0 && <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{count}</span>}
                </a>
                <button onClick={() => toggleActive(t.id, t.is_active)}
                  className="btn-outline py-1 px-2 text-xs">
                  {t.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                </button>
                <button
                  onClick={() => togglePublic(t.id, t.is_public ?? false)}
                  title={t.is_public ? 'Topluluktan kaldır' : 'Toplulukta paylaş'}
                  className={`btn-outline py-1 px-2 text-xs flex items-center gap-1
                    ${t.is_public ? 'border-blue-300 text-blue-600' : ''}`}>
                  {t.is_public ? <Globe size={11} /> : <Lock size={11} />}
                  {t.is_public ? 'Herkese Açık' : 'Özel'}
                </button>
                <button onClick={() => deleteTest(t.id)}
                  className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors">Sil</button>
              </div>
            </div>
          )
        })}

        <button onClick={() => setAddOpen(true)}
          className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-sage hover:text-sage transition-colors min-h-[160px]">
          <span className="text-3xl">+</span>
          <span className="text-sm font-medium">Yeni Test</span>
        </button>
      </div>

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Yeni Test Oluştur</h3>
              <button onClick={() => setAddOpen(false)} className="text-muted text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">Test Adı *</label>
                <input className="input" required placeholder="ör. Beck Depresyon Envanteri"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: toSlug(e.target.value) }))} />
              </div>
              <div>
                <label className="label">URL Kısaltması *</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted whitespace-nowrap font-mono">{profileSlug}/test/</span>
                  <input className="input font-mono" required placeholder="bdi"
                    value={form.slug} onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="label">Açıklama</label>
                <input className="input" placeholder="ör. 21 madde · Otomatik puanlama"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-sage"
                  checked={form.is_public}
                  onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} />
                <span className="text-xs text-charcoal">Topluluk havuzunda herkese açık yap</span>
              </label>
              {/* İki buton: sadece oluştur (JSON ile doldurulacak) ya da manuel soru oluşturucu */}
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-xs text-muted font-medium">Soruları nasıl eklemek istersiniz?</p>
                <div className="flex gap-3">
                  <button type="submit" disabled={loading}
                    className="btn-outline flex-1 justify-center text-xs disabled:opacity-60">
                    {loading ? 'Oluşturuluyor…' : '📋 Boş Oluştur'}
                  </button>
                  <button type="button" disabled={loading}
                    onClick={async () => {
                      if (!form.title || !form.slug) { toast.error('Başlık ve URL zorunlu'); return }
                      setLoading(true)
                      try {
                        const res = await fetch('/api/tests', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: form.title, slug: form.slug, description: form.description, questions: [], is_public: form.is_public }),
                        })
                        if (!res.ok) throw new Error((await res.json()).error)
                        const newTest: TestWithCount = await res.json()
                        setTests(t => [newTest, ...t])
                        setAddOpen(false)
                        setForm({ title: '', slug: '', description: '', is_public: false })
                        setQuizTestId(newTest.id)
                        toast.success('Test oluşturuldu! Sorular ekleniyor…')
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : 'Hata oluştu')
                      } finally { setLoading(false) }
                    }}
                    className="btn-primary flex-1 justify-center text-xs disabled:opacity-60">
                    ✏️ Manuel Oluştur
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  <strong>Boş Oluştur:</strong> JSON import veya sonradan düzenle. <strong>Manuel:</strong> Adım adım soru ekle.
                </p>
              </div>
              <button type="button" onClick={() => setAddOpen(false)} className="btn-outline w-full justify-center text-sm">İptal</button>
            </form>
          </div>
        </div>
      )}

      {/* QuizApp — test oluşturulunca otomatik açılır */}
      {quizTestId && (
        <QuizApp
          testId={quizTestId}
          initialQuestions={[]}
          onSave={async (questions) => {
            // QuizApp zaten { label, score } formatında options üretiyor — doğrudan kullan
            type QAQuestion = { text: string; type: string; options: { label: string; score: number }[] }
            const formatted = (questions as QAQuestion[]).map((q) => ({
              text: q.text,
              options: q.options && q.options.length > 0
                ? q.options.map((o) => ({ label: o.label, score: Number(o.score ?? 0) }))
                : [],
            }))
            try {
              const res = await fetch('/api/tests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: quizTestId, questions: formatted }),
              })
              if (!res.ok) throw new Error((await res.json()).error)
              setTests(ts => ts.map(t =>
                t.id === quizTestId ? { ...t, questions: formatted } : t
              ))
              toast.success('Sorular kaydedildi! ✓')
            } catch (err: unknown) {
              toast.error(err instanceof Error ? err.message : 'Kayıt başarısız')
            }
            setQuizTestId(null)
          }}
          onClose={() => setQuizTestId(null)}
        />
      )}
    </div>
  )
}
