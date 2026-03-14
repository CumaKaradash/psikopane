'use client'
// components/panel/NewsClient.tsx

import { useState } from 'react'
import {
  Search, ExternalLink, Clock, Bookmark,
  BookmarkCheck, Rss, Filter,
} from 'lucide-react'
import type { Article } from '@/app/panel/news/page'

interface Props { articles: Article[] }

const CATEGORIES = ['Tümü', 'Araştırma', 'Nörobilim', 'Klinik', 'Teknoloji', 'Uygulama']

const CAT_COLOR: Record<string, { bar: string; badge: string; text: string }> = {
  'Araştırma': { bar: 'bg-blue-400',   badge: 'bg-blue-50',   text: 'text-blue-700' },
  'Nörobilim': { bar: 'bg-purple-400', badge: 'bg-purple-50', text: 'text-purple-700' },
  'Klinik':    { bar: 'bg-sage',       badge: 'bg-sage-pale', text: 'text-sage' },
  'Teknoloji': { bar: 'bg-orange-400', badge: 'bg-orange-50', text: 'text-orange-700' },
  'Uygulama':  { bar: 'bg-green-400',  badge: 'bg-green-50',  text: 'text-green-700' },
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function timeAgo(s: string) {
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (days === 0) return 'Bugün'
  if (days === 1) return 'Dün'
  if (days < 7)  return `${days} gün önce`
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`
  return `${Math.floor(days / 30)} ay önce`
}

export default function NewsClient({ articles }: Props) {
  const [search,   setSearch]   = useState('')
  const [cat,      setCat]      = useState('Tümü')
  const [saved,    setSaved]    = useState<Set<string>>(new Set())
  const [showOnly, setShowOnly] = useState<'all' | 'saved'>('all')

  const filtered = articles.filter(a => {
    if (showOnly === 'saved' && !saved.has(a.id)) return false
    if (cat !== 'Tümü' && a.category !== cat) return false
    const q = search.toLowerCase()
    return !q
      || a.title.toLowerCase().includes(q)
      || a.summary.toLowerCase().includes(q)
      || a.tags.some(t => t.toLowerCase().includes(q))
  })

  const featured = filtered.filter(a => a.featured)
  const regular  = filtered.filter(a => !a.featured)

  function toggleSave(id: string) {
    setSaved(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  /* ── Kart bileşeni ──────────────────────────────────────────────────────── */
  function ArticleCard({ article: a, large = false }: { article: Article; large?: boolean }) {
    const colors = CAT_COLOR[a.category] ?? CAT_COLOR['Araştırma']
    const isSaved = saved.has(a.id)

    return (
      <article className={`card flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200
        ${large ? 'md:flex-row' : ''}`}>

        {/* Placeholder görsel */}
        <div className={`flex-shrink-0 relative overflow-hidden
          ${large ? 'md:w-56 h-36 md:h-auto' : 'h-36'}`}>
          <div className={`absolute inset-0 ${colors.bar} opacity-20`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-20 select-none">
              {a.category === 'Araştırma' ? '🔬'
               : a.category === 'Nörobilim' ? '🧠'
               : a.category === 'Klinik'    ? '🌿'
               : a.category === 'Teknoloji' ? '💡'
               : '📖'}
            </span>
          </div>
          {/* Renk şeridi */}
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${colors.bar}`} />
        </div>

        <div className="p-5 flex flex-col flex-1">
          {/* Kategori + kaydet */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.badge} ${colors.text}`}>
              {a.category}
            </span>
            <button
              onClick={() => toggleSave(a.id)}
              title={isSaved ? 'Kaydedilenlerden çıkar' : 'Kaydet'}
              className={`p-1 rounded-lg transition-all hover:bg-cream ${isSaved ? 'text-accent' : 'text-muted'}`}
            >
              {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          </div>

          {/* Başlık */}
          <h3 className={`font-semibold leading-snug mb-2 line-clamp-2 ${large ? 'text-base' : 'text-sm'}`}>
            {a.title}
          </h3>

          {/* Özet */}
          <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-3 flex-1">
            {a.summary}
          </p>

          {/* Etiketler */}
          <div className="flex flex-wrap gap-1 mb-4">
            {a.tags.map(tag => (
              <button
                key={tag}
                onClick={() => setSearch(tag)}
                className="bg-cream hover:bg-border text-muted text-[10px] px-2 py-0.5 rounded-full transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Alt satır */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60 gap-2">
            <div className="flex items-center gap-2 text-[11px] text-muted min-w-0">
              <span className="truncate font-medium">{a.source}</span>
              <span className="text-border flex-shrink-0">·</span>
              <span className="flex items-center gap-0.5 flex-shrink-0">
                <Clock size={10} /> {a.readTime}
              </span>
              <span className="text-border flex-shrink-0 hidden sm:inline">·</span>
              <span className="flex-shrink-0 hidden sm:inline">{timeAgo(a.date)}</span>
            </div>
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sage text-xs font-semibold hover:underline flex-shrink-0"
            >
              Oku <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Arama + filtreler */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Başlık, özet veya etiket ara…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => setShowOnly(s => s === 'saved' ? 'all' : 'saved')}
          className={`btn-outline flex items-center gap-1.5 text-xs flex-shrink-0
            ${showOnly === 'saved' ? 'border-accent text-accent' : ''}`}
        >
          <BookmarkCheck size={13} />
          {showOnly === 'saved' ? 'Tümünü Göster' : `Kaydedilenler (${saved.size})`}
        </button>
      </div>

      {/* Kategori filtreleri */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 border
              ${cat === c
                ? 'bg-charcoal text-white border-charcoal'
                : 'bg-white text-muted border-border hover:border-charcoal hover:text-charcoal'}`}>
            {c !== 'Tümü' && (
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                ${CAT_COLOR[c]?.bar ?? 'bg-muted'}`} />
            )}
            {c}
            <span className={`text-[10px] ${cat === c ? 'text-white/60' : 'text-muted'}`}>
              {c === 'Tümü'
                ? articles.length
                : articles.filter(a => a.category === c).length}
            </span>
          </button>
        ))}
      </div>

      {/* Sonuç yok */}
      {filtered.length === 0 && (
        <div className="card py-20 text-center">
          <Rss size={32} className="mx-auto text-muted opacity-30 mb-3" />
          <p className="text-sm text-muted">
            {showOnly === 'saved'
              ? 'Kaydettiğiniz makale yok.'
              : 'Arama kriterlerine uygun makale bulunamadı.'}
          </p>
        </div>
      )}

      {/* Öne çıkan makaleler */}
      {featured.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Öne Çıkanlar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featured.map(a => <ArticleCard key={a.id} article={a} large />)}
          </div>
        </div>
      )}

      {/* Ana grid */}
      {regular.length > 0 && (
        <div>
          {featured.length > 0 && (
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
              Tüm Makaleler
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {regular.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        </div>
      )}

      {/* Alt bilgi */}
      <div className="mt-10 bg-sage-pale rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center flex-shrink-0">
          <Rss size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-sage mb-1">Gerçek Zamanlı Entegrasyon</p>
          <p className="text-xs text-muted leading-relaxed">
            Bu sayfa statik verilerle çalışmaktadır. Gerçek bir RSS kaynağına veya
            akademik dergi API adresine bağlamak için{' '}
            <code className="bg-white px-1 py-0.5 rounded text-xs">app/panel/news/page.tsx</code>{' '}
            içindeki <code className="bg-white px-1 py-0.5 rounded text-xs">ARTICLES</code>{' '}
            dizisini dinamik bir <code className="bg-white px-1 py-0.5 rounded text-xs">fetch()</code>{' '}
            çağrısıyla değiştirebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
