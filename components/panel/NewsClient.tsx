'use client'
// components/panel/NewsClient.tsx

import { useState } from 'react'
import {
  Search, ExternalLink, Clock, Bookmark,
  BookmarkCheck, Rss, Plus, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Article } from '@/app/panel/news/page'

interface RssFeed {
  id:         string
  url:        string
  label:      string | null
  created_at: string
}

interface Props {
  articles:  Article[]
  rssFeeds:  RssFeed[]
}

const CATEGORIES = ['Tümü', 'Araştırma', 'Nörobilim', 'Klinik', 'Teknoloji', 'Uygulama']

const CAT_COLOR: Record<string, { bar: string; badge: string; text: string }> = {
  'Araştırma': { bar: 'bg-blue-400',   badge: 'bg-blue-50',   text: 'text-blue-700' },
  'Nörobilim': { bar: 'bg-purple-400', badge: 'bg-purple-50', text: 'text-purple-700' },
  'Klinik':    { bar: 'bg-sage',       badge: 'bg-sage-pale', text: 'text-sage' },
  'Teknoloji': { bar: 'bg-orange-400', badge: 'bg-orange-50', text: 'text-orange-700' },
  'Uygulama':  { bar: 'bg-green-400',  badge: 'bg-green-50',  text: 'text-green-700' },
}

function timeAgo(s: string) {
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (days === 0) return 'Bugün'
  if (days === 1) return 'Dün'
  if (days < 7)  return `${days} gün önce`
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`
  return `${Math.floor(days / 30)} ay önce`
}

export default function NewsClient({ articles, rssFeeds: initialFeeds }: Props) {
  const [search,     setSearch]     = useState('')
  const [cat,        setCat]        = useState('Tümü')
  const [saved,      setSaved]      = useState<Set<string>>(new Set())
  const [showOnly,   setShowOnly]   = useState<'all' | 'saved'>('all')
  const [feeds,      setFeeds]      = useState<RssFeed[]>(initialFeeds)
  const [rssOpen,    setRssOpen]    = useState(false)
  const [rssUrl,     setRssUrl]     = useState('')
  const [rssLabel,   setRssLabel]   = useState('')
  const [rssLoading, setRssLoading] = useState(false)

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

  async function addFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!rssUrl.trim()) return
    setRssLoading(true)
    try {
      const res = await fetch('/api/rss-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rssUrl.trim(), label: rssLabel.trim() || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const feed: RssFeed = await res.json()
      setFeeds(f => [...f, feed])
      setRssUrl('')
      setRssLabel('')
      toast.success('RSS kaynağı eklendi!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eklenemedi')
    } finally {
      setRssLoading(false)
    }
  }

  async function deleteFeed(id: string) {
    const res = await fetch(`/api/rss-feeds?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFeeds(f => f.filter(x => x.id !== id))
      toast.success('RSS kaynağı kaldırıldı')
    } else {
      toast.error('Silinemedi')
    }
  }

  function ArticleCard({ article: a, large = false }: { article: Article; large?: boolean }) {
    const colors  = CAT_COLOR[a.category] ?? CAT_COLOR['Araştırma']
    const isSaved = saved.has(a.id)

    return (
      <article className={`card flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 ${large ? 'md:flex-row' : ''}`}>
        <div className={`flex-shrink-0 relative overflow-hidden ${large ? 'md:w-56 h-36 md:h-auto' : 'h-36'}`}>
          <div className={`absolute inset-0 ${colors.bar} opacity-20`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-20 select-none">
              {a.category === 'Araştırma' ? '🔬' : a.category === 'Nörobilim' ? '🧠' : a.category === 'Klinik' ? '🌿' : a.category === 'Teknoloji' ? '💡' : '📖'}
            </span>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${colors.bar}`} />
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.badge} ${colors.text}`}>
              {a.category}
            </span>
            <button onClick={() => toggleSave(a.id)} title={isSaved ? 'Kaydedilenlerden çıkar' : 'Kaydet'}
              className={`p-1 rounded-lg transition-all hover:bg-cream ${isSaved ? 'text-accent' : 'text-muted'}`}>
              {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          </div>

          <h3 className={`font-semibold leading-snug mb-2 line-clamp-2 ${large ? 'text-base' : 'text-sm'}`}>{a.title}</h3>
          <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-3 flex-1">{a.summary}</p>

          <div className="flex flex-wrap gap-1 mb-4">
            {a.tags.map(tag => (
              <button key={tag} onClick={() => setSearch(tag)}
                className="bg-cream hover:bg-border text-muted text-[10px] px-2 py-0.5 rounded-full transition-colors">
                #{tag}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60 gap-2">
            <div className="flex items-center gap-2 text-[11px] text-muted min-w-0">
              <span className="truncate font-medium">{a.source}</span>
              <span className="text-border flex-shrink-0">·</span>
              <span className="flex items-center gap-0.5 flex-shrink-0"><Clock size={10} /> {a.readTime}</span>
              <span className="text-border flex-shrink-0 hidden sm:inline">·</span>
              <span className="flex-shrink-0 hidden sm:inline">{timeAgo(a.date)}</span>
            </div>
            <a href={a.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sage text-xs font-semibold hover:underline flex-shrink-0">
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
          <input type="text" placeholder="Başlık, özet veya etiket ara…" value={search}
            onChange={e => setSearch(e.target.value)} className="input pl-9" />
        </div>
        <button onClick={() => setShowOnly(s => s === 'saved' ? 'all' : 'saved')}
          className={`btn-outline flex items-center gap-1.5 text-xs flex-shrink-0 ${showOnly === 'saved' ? 'border-accent text-accent' : ''}`}>
          <BookmarkCheck size={13} />
          {showOnly === 'saved' ? 'Tümünü Göster' : `Kaydedilenler (${saved.size})`}
        </button>
        <button onClick={() => setRssOpen(true)}
          className="btn-outline flex items-center gap-1.5 text-xs flex-shrink-0">
          <Rss size={13} />
          RSS Yönet
          {feeds.length > 0 && (
            <span className="bg-sage text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">{feeds.length}</span>
          )}
        </button>
      </div>

      {/* Kategori filtreleri */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 border
              ${cat === c ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-muted border-border hover:border-charcoal hover:text-charcoal'}`}>
            {c !== 'Tümü' && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CAT_COLOR[c]?.bar ?? 'bg-muted'}`} />}
            {c}
            <span className={`text-[10px] ${cat === c ? 'text-white/60' : 'text-muted'}`}>
              {c === 'Tümü' ? articles.length : articles.filter(a => a.category === c).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card py-20 text-center">
          <Rss size={32} className="mx-auto text-muted opacity-30 mb-3" />
          <p className="text-sm text-muted">
            {showOnly === 'saved' ? 'Kaydettiğiniz makale yok.' : 'Arama kriterlerine uygun makale bulunamadı.'}
          </p>
        </div>
      )}

      {featured.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Öne Çıkanlar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featured.map(a => <ArticleCard key={a.id} article={a} large />)}
          </div>
        </div>
      )}

      {regular.length > 0 && (
        <div>
          {featured.length > 0 && (
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Tüm Makaleler</h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {regular.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        </div>
      )}

      {/* RSS Modal */}
      {rssOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rss size={16} className="text-sage" />
                <h3 className="font-semibold">RSS Kaynaklarım</h3>
              </div>
              <button onClick={() => setRssOpen(false)} className="text-muted text-2xl leading-none hover:text-charcoal">×</button>
            </div>

            <div className="p-6 space-y-5">
              <form onSubmit={addFeed} className="space-y-3">
                <p className="text-xs text-muted">
                  Psikoloji dergisi veya blog RSS adresini ekleyin. Kaydedilen adresler gelecekte otomatik içerik çekimi için kullanılacak.
                </p>
                <div>
                  <label className="label">RSS / Atom URL *</label>
                  <input className="input font-mono text-sm" type="url"
                    placeholder="https://example.com/feed.xml"
                    value={rssUrl} onChange={e => setRssUrl(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Etiket <span className="text-muted font-normal">(opsiyonel)</span></label>
                  <input className="input" placeholder="ör. Türk Psikiyatri Dergisi"
                    value={rssLabel} onChange={e => setRssLabel(e.target.value)} />
                </div>
                <button type="submit" disabled={rssLoading || !rssUrl.trim()}
                  className="btn-primary w-full justify-center flex items-center gap-2 disabled:opacity-60">
                  <Plus size={14} />
                  {rssLoading ? 'Ekleniyor…' : 'Kaynak Ekle'}
                </button>
              </form>

              {feeds.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Kayıtlı Kaynaklar ({feeds.length})
                  </p>
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {feeds.map(f => (
                      <li key={f.id} className="flex items-center gap-3 bg-cream rounded-xl px-4 py-3">
                        <Rss size={14} className="text-sage flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {f.label && <p className="text-xs font-semibold text-charcoal truncate">{f.label}</p>}
                          <p className="text-[11px] text-muted font-mono truncate">{f.url}</p>
                        </div>
                        <button onClick={() => deleteFeed(f.id)}
                          className="p-1 text-muted hover:text-red-500 transition-colors flex-shrink-0" title="Kaldır">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-center text-xs text-muted py-2">Henüz kaynak eklenmemiş.</p>
              )}

              <button onClick={() => setRssOpen(false)} className="btn-outline w-full justify-center">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
