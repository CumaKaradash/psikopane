'use client'
// components/panel/CommunityClient.tsx

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Search, Download, Copy, FlaskConical,
  User, ChevronDown, ChevronUp, CheckCircle2, Sparkles,
} from 'lucide-react'

interface PublicTestItem {
  id:             string
  title:          string
  description:    string | null
  questions:      { text: string; options?: { label: string; score: number }[] }[]
  slug:           string
  created_at:     string
  is_active:      boolean
  is_public:      boolean
  author?: { id: string; full_name: string; title?: string; slug: string } | null
}

interface Props {
  publicTests:   PublicTestItem[]
  myPublicCount: number
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Depresyon':  ['depresyon', 'bdi', 'beck', 'phq', 'mood'],
  'Anksiyete':  ['anksiyete', 'anxiety', 'gad', 'kaygı', 'bai', 'stai'],
  'Travma':     ['travma', 'ptsd', 'trauma', 'pcl'],
  'Kişilik':    ['kişilik', 'personality', 'mmpi', 'neo'],
  'Genel':      [],
}

function detectCategory(title: string, desc: string | null): string {
  const text = `${title} ${desc ?? ''}`.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'Genel') continue
    if (keywords.some(k => text.includes(k))) return cat
  }
  return 'Genel'
}

const CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Depresyon': { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  'Anksiyete': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  'Travma':    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
  'Kişilik':   { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  'Genel':     { bg: 'bg-sage-pale', text: 'text-sage',       dot: 'bg-sage' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Bugün'
  if (days === 1) return 'Dün'
  if (days < 7)  return `${days} gün önce`
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`
  return `${Math.floor(days / 30)} ay önce`
}

export default function CommunityClient({ publicTests, myPublicCount }: Props) {
  const [search,   setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState<string>('Tümü')
  const [cloning,  setCloning]  = useState<string | null>(null)
  const [cloned,   setCloned]   = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sortBy,   setSortBy]   = useState<'new' | 'questions'>('new')

  // Kategorileri dinamik hesapla
  const allCategories = ['Tümü', ...Object.keys(CAT_COLORS)]

  const enriched = publicTests.map(t => ({
    ...t,
    category: detectCategory(t.title, t.description),
  }))

  const filtered = enriched
    .filter(t => {
      const matchCat = catFilter === 'Tümü' || t.category === catFilter
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.author?.full_name ?? '').toLowerCase().includes(q)
      return matchCat && matchSearch
    })
    .sort((a, b) =>
      sortBy === 'new'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : b.questions.length - a.questions.length
    )

  // ── Klonla ─────────────────────────────────────────────────────────────
  async function cloneTest(id: string, title: string) {
    setCloning(id)
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone', source_id: id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setCloned(s => new Set(s).add(id))
      toast.success(`"${title}" paneline eklendi!`, { icon: '🎉' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Klonlama başarısız')
    } finally {
      setCloning(null)
    }
  }

  // ── JSON İndir ─────────────────────────────────────────────────────────
  function downloadJSON(test: PublicTestItem) {
    const payload = {
      title:       test.title,
      description: test.description,
      questions:   test.questions,
      source:      'psikopanel-community',
      exported_at: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${test.slug}.json` })
    a.click()
    URL.revokeObjectURL(url)
    toast.success('JSON indirildi')
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Hero banner — sadece test yoksa göster */}
      {publicTests.length === 0 && myPublicCount === 0 && (
        <div className="card mb-6 p-6 bg-gradient-to-r from-sage-pale to-cream border-sage-l">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sage flex items-center justify-center flex-shrink-0">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-charcoal mb-1">Topluluk havuzunu siz başlatın!</h3>
              <p className="text-sm text-muted leading-relaxed">
                Henüz paylaşılmış test yok. Test Yönetimi sayfasında testlerinizi
                <strong> "Herkese Açık"</strong> yaparak diğer psikologlarla paylaşabilirsiniz.
              </p>
              <a href="/panel/tests" className="btn-primary mt-3 text-xs py-2 px-4 inline-flex">
                Testlere Git →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Arama + sıralama + filtre */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Test adı, açıklama veya yazar ara…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        {/* Sıralama */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'new' | 'questions')}
          className="input md:w-44 flex-shrink-0"
        >
          <option value="new">En yeni</option>
          <option value="questions">Soru sayısı</option>
        </select>
      </div>

      {/* Kategori filtreleri */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
        {allCategories.map(cat => {
          const colors = cat === 'Tümü' ? null : CAT_COLORS[cat]
          const count = cat === 'Tümü'
            ? filtered.length
            : enriched.filter(t => t.category === cat).length
          return (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 border
                ${catFilter === cat
                  ? 'bg-charcoal text-white border-charcoal'
                  : 'bg-white text-muted border-border hover:border-charcoal hover:text-charcoal'}`}>
              {colors && <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />}
              {cat}
              <span className={`text-[10px] ${catFilter === cat ? 'text-white/70' : 'text-muted'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card py-20 text-center">
          <FlaskConical size={32} className="mx-auto text-muted mb-3 opacity-40" />
          <p className="text-sm font-medium text-muted">
            {search ? `"${search}" için sonuç bulunamadı` : 'Bu kategoride test yok'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => {
            const colors  = CAT_COLORS[t.category]
            const isOpen  = expanded === t.id
            const isDone  = cloned.has(t.id)
            const initials = t.author?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

            return (
              <div key={t.id}
                className="card flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">

                {/* Kategori şeridi */}
                <div className={`h-[3px] w-full ${colors.dot}`} />

                <div className="p-5 flex flex-col flex-1">
                  {/* Üst satır: kategori pill + soru sayısı */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {t.category}
                    </span>
                    <span className="text-[11px] text-muted bg-cream px-2 py-0.5 rounded-full">
                      {t.questions?.length ?? 0} soru
                    </span>
                  </div>

                  {/* Başlık */}
                  <h4 className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2">
                    {t.title}
                  </h4>

                  {/* Açıklama */}
                  {t.description && (
                    <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  {/* Soru önizleme (açılır) */}
                  {t.questions.length > 0 && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : t.id)}
                      className="flex items-center gap-1 text-[11px] text-sage hover:underline mb-3 self-start"
                    >
                      {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isOpen ? 'Önizlemeyi kapat' : 'İlk 3 soruyu önizle'}
                    </button>
                  )}

                  {isOpen && (
                    <div className="bg-cream rounded-xl p-3 mb-3 space-y-2">
                      {t.questions.slice(0, 3).map((q, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-[10px] font-bold text-sage w-4 flex-shrink-0 mt-0.5">
                            {i + 1}.
                          </span>
                          <p className="text-[11px] text-charcoal leading-relaxed line-clamp-2">
                            {q.text}
                          </p>
                        </div>
                      ))}
                      {t.questions.length > 3 && (
                        <p className="text-[10px] text-muted pl-6">
                          + {t.questions.length - 3} soru daha…
                        </p>
                      )}
                    </div>
                  )}

                  {/* Yazar + tarih */}
                  <div className="flex items-center gap-2 mt-auto mb-4">
                    <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-charcoal truncate">
                        {t.author?.full_name ?? 'Anonim'}
                      </p>
                      {t.author?.title && (
                        <p className="text-[10px] text-muted truncate">{t.author.title}</p>
                      )}
                    </div>
                    <span className="ml-auto text-[10px] text-muted flex-shrink-0">
                      {timeAgo(t.created_at)}
                    </span>
                  </div>

                  {/* Aksiyonlar */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => cloneTest(t.id, t.title)}
                      disabled={cloning === t.id || isDone}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all
                        ${isDone
                          ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                          : 'btn-primary disabled:opacity-60'}`}
                    >
                      {isDone
                        ? <><CheckCircle2 size={12} /> Eklendi</>
                        : cloning === t.id
                        ? 'Klonlanıyor…'
                        : <><Copy size={12} /> Paneline Klonla</>}
                    </button>

                    <button
                      onClick={() => downloadJSON(t)}
                      className="btn-outline px-2.5 flex items-center gap-1 text-xs"
                      title="JSON olarak indir"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Alt bilgi */}
      {publicTests.length > 0 && (
        <p className="text-center text-xs text-muted mt-8">
          Kendi testlerinizi paylaşmak için{' '}
          <a href="/panel/tests" className="text-sage hover:underline font-medium">
            Test Yönetimi → "Herkese Açık"
          </a>
          {' '}seçeneğini kullanın.
        </p>
      )}
    </div>
  )
}
