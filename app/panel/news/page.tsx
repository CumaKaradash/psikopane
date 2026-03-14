// app/panel/news/page.tsx
// Statik JSON şimdilik — RSS/API'ye kolayca geçilebilir mimari

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

// ── Mock veri (gerçek RSS/API ile değiştirilebilir) ─────────────────────────
const ARTICLES: Article[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
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
    id: '4',
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
    id: '5',
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
    id: '6',
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
    id: '7',
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
    id: '8',
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

export default async function NewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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
            {ARTICLES.length} makale
          </span>
        </div>
      </header>

      <NewsClient articles={ARTICLES} />
    </>
  )
}
