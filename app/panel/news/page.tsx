// app/panel/news/page.tsx

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewsClient from '@/components/panel/NewsClient'

export interface Article {
  id:        string
  title:     string
  summary:   string
  category:  string
  source:    string
  url:       string
  date:      string
  readTime:  string
  tags:      string[]
  featured?: boolean
}

// ── Varsayılan statik makaleler ─────────────────────────────────────────────
const STATIC_ARTICLES: Article[] = [
  {
    id: 'static-1',
    title: 'Bilişsel Davranışçı Terapi\'nin Dijital Platformlarda Etkinliği',
    summary: 'Son yayımlanan meta-analiz çalışması, online BDT uygulamalarının yüz yüze seanslarla karşılaştırılabilir etkinlik gösterdiğini ortaya koyuyor. Araştırma 48 randomize kontrollü çalışmayı kapsıyor.',
    category: 'Araştırma',
    source: 'Journal of Clinical Psychology',
    url: 'https://pubmed.ncbi.nlm.nih.gov/',
    date: '2026-03-10',
    readTime: '5 dk',
    tags: ['BDT', 'Online Terapi', 'Meta-analiz'],
    featured: true,
  },
  {
    id: 'static-2',
    title: 'Travma Sonrası Büyüme: Yeni Nörogörüntüleme Bulguları',
    summary: 'Araştırmacılar, travma sonrası büyüme yaşayan bireylerin prefrontal korteksinde yapısal değişiklikler tespit etti. fMRI çalışmaları iyileşmenin nörobiologik temellerine yeni ışık tutuyor.',
    category: 'Nörobilim',
    source: 'Psychological Science',
    url: 'https://journals.sagepub.com/home/pss',
    date: '2026-03-08',
    readTime: '7 dk',
    tags: ['Travma', 'Nörobilim', 'PTSD'],
    featured: true,
  },
  {
    id: 'static-3',
    title: 'Ergen Depresyonunda Dijital Farkındalık Uygulamaları',
    summary: 'Türkiye\'de yürütülen çok merkezli RCT çalışması, okul tabanlı farkındalık programlarının 12-17 yaş grubunda depresyon semptomlarını anlamlı düzeyde azalttığını gösteriyor.',
    category: 'Klinik',
    source: 'Türk Psikiyatri Dergisi',
    url: 'https://www.turkpsikiyatri.com',
    date: '2026-03-05',
    readTime: '6 dk',
    tags: ['Ergen', 'Depresyon', 'Mindfulness'],
  },
  {
    id: 'static-4',
    title: 'YZ Destekli Psikometrik Değerlendirme: Fırsatlar ve Etik Sınırlar',
    summary: 'GPT tabanlı modeller psikometrik testlerin yanında tamamlayıcı araç olarak kullanılmaya başlandı. Klinisyenlerin rolü ve olası önyargılar akademik çevrelerde tartışılıyor.',
    category: 'Teknoloji',
    source: 'npj Digital Medicine',
    url: 'https://www.nature.com/npjdigitalmed/',
    date: '2026-03-03',
    readTime: '8 dk',
    tags: ['Yapay Zeka', 'Psikometri', 'Etik'],
  },
  {
    id: 'static-5',
    title: 'İş Tükenmişliği Sendromunda Yeni DSM Kriterleri Tartışması',
    summary: 'Tükenmişlik sendromunun bağımsız bir tanı olarak sınıflandırılması için akademik baskı artıyor. Klinik sınırlar, ayırıcı tanı kriterleri ve tedavi protokolleri üzerine konsensüs arayışı sürüyor.',
    category: 'Klinik',
    source: 'American Psychologist',
    url: 'https://www.apa.org/pubs/journals/amp',
    date: '2026-02-28',
    readTime: '4 dk',
    tags: ['Tükenmişlik', 'DSM', 'Tanı'],
  },
  {
    id: 'static-6',
    title: 'Çift Terapisinde EFT ve Gottman: Karşılaştırmalı Etkinlik',
    summary: 'Son on yılda çift terapisi alanına giren yeni modellerin sistematik derlemesi, EFT\'nin bağlanma güvensizliğinde, Gottman\'ın ise çatışma yönetiminde üstün çıktılar sağladığını ortaya koyuyor.',
    category: 'Uygulama',
    source: 'Family Process',
    url: 'https://onlinelibrary.wiley.com/journal/15455300',
    date: '2026-02-25',
    readTime: '6 dk',
    tags: ['Çift Terapisi', 'EFT', 'Gottman'],
  },
  {
    id: 'static-7',
    title: 'EMDR\'nin Anksiyete Bozukluklarındaki Etkinliğine Dair Yeni Kanıtlar',
    summary: 'Uzun süredir yalnızca PTSD tedavisinde standart kabul edilen EMDR\'nin, sosyal fobi ve panik bozuklukta da kılavuz önerisine alınmasına ilişkin yeni meta-analitik veriler yayımlandı.',
    category: 'Uygulama',
    source: 'Journal of EMDR Practice',
    url: 'https://connect.springerpub.com/content/sgrjemdre',
    date: '2026-02-20',
    readTime: '5 dk',
    tags: ['EMDR', 'Anksiyete', 'PTSD'],
  },
  {
    id: 'static-8',
    title: 'Nöroplastisite ve Psikoterapi: Beyin Nasıl Değişir?',
    summary: 'Çeşitli psikoterapi modalitelerinin nöroplastisiteyi nasıl etkilediğini inceleyen derleme çalışması, başarılı terapinin prefrontal korteks ve amigdala bağlantısallığını artırdığını gösteriyor.',
    category: 'Nörobilim',
    source: 'Neuroscience & Biobehavioral Reviews',
    url: 'https://www.sciencedirect.com/journal/neuroscience-and-biobehavioral-reviews',
    date: '2026-02-15',
    readTime: '9 dk',
    tags: ['Nöroplastisite', 'Beyin', 'Psikoterapi'],
  },
]

// ── RSS / Atom XML'i parse et ────────────────────────────────────────────────
function parseRSSItems(xml: string, feedLabel: string | null, feedUrl: string): Article[] {
  const articles: Article[] = []
  try {
    // Hem RSS <item> hem Atom <entry> destekle
    const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi
    const matches = [...xml.matchAll(itemRegex)]

    matches.slice(0, 10).forEach((match, i) => {
      const block = match[1]

      const title   = stripTags(getTag(block, 'title'))
      const link    = getTag(block, 'link') || getLinkAttr(block) || feedUrl
      const summary = stripTags(getTag(block, 'description') || getTag(block, 'summary') || getTag(block, 'content'))
      const pubDate = getTag(block, 'pubDate') || getTag(block, 'published') || getTag(block, 'updated') || ''

      if (!title) return

      const dateStr = pubDate
        ? new Date(pubDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const source = feedLabel || new URL(feedUrl).hostname.replace('www.', '')

      articles.push({
        id:       `rss-${Buffer.from(feedUrl).toString('base64').slice(0, 8)}-${i}`,
        title:    title.slice(0, 200),
        summary:  summary.slice(0, 400) || 'İçerik mevcut değil.',
        category: 'Araştırma',
        source,
        url:      link,
        date:     dateStr,
        readTime: '5 dk',
        tags:     [],
      })
    })
  } catch {
    // Parse hatası — sessizce geç
  }
  return articles
}

function getTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
    || xml.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function getLinkAttr(xml: string): string {
  const m = xml.match(/<link[^>]+href=["']([^"']+)["']/i)
  return m ? m[1] : ''
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim()
}

// ── RSS feed'lerini çek ──────────────────────────────────────────────────────
async function fetchRssArticles(feeds: { id: string; url: string; label: string | null }[]): Promise<Article[]> {
  if (feeds.length === 0) return []

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'PsikoPanel/1.0' },
        next: { revalidate: 3600 }, // 1 saat cache
      })
      if (!res.ok) return []
      const xml = await res.text()
      return parseRSSItems(xml, feed.label, feed.url)
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<Article[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
}

export default async function NewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rssFeeds } = await supabase
    .from('rss_feeds')
    .select('id, url, label, created_at')
    .eq('psychologist_id', user.id)
    .order('created_at', { ascending: true })

  // Kullanıcının RSS feed'lerinden makaleleri çek
  const rssArticles = await fetchRssArticles(rssFeeds ?? [])

  // RSS makaleleri önce, ardından statik makaleler
  const allArticles: Article[] = [
    ...rssArticles,
    ...STATIC_ARTICLES,
  ]

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between pl-10 md:pl-0">
          <div>
            <h2 className="font-serif text-xl">Psikoloji Bülteni</h2>
            <p className="text-xs text-muted mt-0.5">
              Güncel araştırmalar, klinik haberler ve alan yayınları
            </p>
          </div>
          <span className="hidden md:flex items-center gap-1.5 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-sage inline-block animate-pulse" />
            {allArticles.length} makale
            {rssArticles.length > 0 && (
              <span className="text-sage ml-1">({rssArticles.length} RSS)</span>
            )}
          </span>
        </div>
      </header>

      <NewsClient articles={allArticles} rssFeeds={rssFeeds ?? []} />
    </>
  )
}
