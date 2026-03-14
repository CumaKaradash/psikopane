// app/[slug]/page.tsx — Bireysel psikolog veya klinik vitrin sayfası (public)

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

// ── Veri çekici yardımcı (generateMetadata + page aynı supabase çağrısını tekrarlamamak için) ──
async function resolveSlug(slug: string) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, full_name, title, bio, session_types, session_price, avatar_url')
    .eq('slug', slug)
    .single()

  if (profile) return { type: 'individual' as const, profile, team: null, members: null }

  const { data: team } = await supabase
    .from('teams')
    .select('id, slug, name, description, session_types, avatar_url')
    .eq('slug', slug)
    .single()

  if (!team) return null

  const { data: members } = await supabase
    .from('team_members')
    .select('profile:profiles!psychologist_id(full_name, title, slug, avatar_url)')
    .eq('team_id', team.id)

  return { type: 'team' as const, profile: null, team, members: members ?? [] }
}

// ── generateMetadata — Open Graph dahil ──────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://psikopanel.tr'
  const result = await resolveSlug(params.slug)

  if (!result) {
    return {
      title:       'Sayfa Bulunamadı | PsikoPanel',
      description: 'Aradığınız profil veya klinik bulunamadı.',
    }
  }

  if (result.type === 'individual') {
    const p    = result.profile!
    const name = p.full_name
    const desc = p.bio
      ?? `${name}${p.title ? ` — ${p.title}` : ''} ile online randevu alın.`
    const imageUrl = p.avatar_url ?? `${appUrl}/og-default.png`
    const pageUrl  = `${appUrl}/${p.slug}`

    return {
      title:       `${name} | PsikoPanel`,
      description: desc,
      openGraph: {
        type:        'profile',
        url:         pageUrl,
        title:       `${name} | PsikoPanel`,
        description: desc,
        images: [
          {
            url:    imageUrl,
            width:  400,
            height: 400,
            alt:    name,
          },
        ],
        siteName: 'PsikoPanel',
        locale:   'tr_TR',
      },
      twitter: {
        card:        'summary',
        title:       `${name} | PsikoPanel`,
        description: desc,
        images:      [imageUrl],
      },
    }
  }

  // Takım
  const t    = result.team!
  const desc = t.description
    ?? `${t.name} — Online randevu alın.`
  const imageUrl = t.avatar_url ?? `${appUrl}/og-default.png`
  const pageUrl  = `${appUrl}/${t.slug}`

  return {
    title:       `${t.name} | PsikoPanel`,
    description: desc,
    openGraph: {
      type:        'website',
      url:         pageUrl,
      title:       `${t.name} | PsikoPanel`,
      description: desc,
      images: [{ url: imageUrl, width: 400, height: 400, alt: t.name }],
      siteName: 'PsikoPanel',
      locale:   'tr_TR',
    },
    twitter: {
      card:        'summary',
      title:       `${t.name} | PsikoPanel`,
      description: desc,
      images:      [imageUrl],
    },
  }
}

// ── Sayfa bileşeni ────────────────────────────────────────────────────────────
export default async function PublicProfilePage({ params }: Props) {
  const result = await resolveSlug(params.slug)
  if (!result) notFound()

  if (result.type === 'individual') {
    const p = result.profile!
    const sessionList = (p.session_types ?? []).map((t: string) => {
      const parts = t.split(' - ')
      return { name: parts[0], price: parts[1] ?? null }
    })
    return (
      <ProfileLayout
        slug={p.slug} name={p.full_name} title={p.title ?? ''}
        bio={p.bio} avatarUrl={p.avatar_url}
        sessionList={sessionList} basePrice={p.session_price}
        isTeam={false} members={null}
      />
    )
  }

  const t = result.team!
  const sessionList = (t.session_types ?? []).map((s: string) => {
    const parts = s.split(' - ')
    return { name: parts[0], price: parts[1] ?? null }
  })
  const memberProfiles = (result.members ?? [])
    .map((m: any) => m.profile)
    .filter(Boolean)

  return (
    <ProfileLayout
      slug={t.slug} name={t.name}
      title={`${memberProfiles.length} Uzman · Klinik`}
      bio={t.description} avatarUrl={t.avatar_url}
      sessionList={sessionList} basePrice={null}
      isTeam={true} members={memberProfiles}
    />
  )
}

// ── Ortak UI ──────────────────────────────────────────────────────────────────
interface LayoutProps {
  slug:        string
  name:        string
  title:       string
  bio:         string | null
  avatarUrl:   string | null
  sessionList: { name: string; price: string | null }[]
  basePrice:   number | null
  isTeam:      boolean
  members:     { full_name: string; title?: string; slug?: string; avatar_url?: string | null }[] | null
}

function ProfileLayout({
  slug, name, title, bio, avatarUrl,
  sessionList, basePrice, isTeam, members,
}: LayoutProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <main className="min-h-screen bg-gradient-to-br from-sage-pale via-cream to-white">
      {/* Kapak */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-sage to-charcoal overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), ' +
              'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px, 40px 40px',
          }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Avatar + isim satırı */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16 mb-6 relative z-10">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-lg flex-shrink-0 overflow-hidden bg-sage">
            {avatarUrl
              ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                  {isTeam ? '🏥' : initials}
                </div>
            }
          </div>
          <div className="text-center sm:text-left pb-2">
            <h1 className="font-serif text-2xl md:text-3xl text-charcoal">{name}</h1>
            <p className="text-muted text-sm mt-0.5">{title}</p>
          </div>
          <div className="sm:ml-auto pb-2">
            <Link href={`/${slug}/booking`}
              className="btn-primary py-3 px-6 text-sm font-semibold shadow-md">
              📅 Hemen Randevu Al
            </Link>
          </div>
        </div>

        {/* Hakkımda */}
        {bio && (
          <div className="card p-6 mb-5">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Hakkımda</h2>
            <p className="text-sm text-charcoal leading-relaxed whitespace-pre-line">{bio}</p>
          </div>
        )}

        {/* Takım üyeleri */}
        {isTeam && members && members.length > 0 && (
          <div className="card p-6 mb-5">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Uzmanlarımız</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {members.map((m, i) => {
                const mi = (m.full_name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        : mi}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{m.full_name}</p>
                      {m.title && <p className="text-[10px] text-muted truncate">{m.title}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Seans türleri */}
        {sessionList.length > 0 && (
          <div className="card p-6 mb-5">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Seans Türleri</h2>
            <ul className="space-y-2">
              {sessionList.map((s, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 px-3 bg-cream rounded-xl">
                  <span className="text-sm font-medium text-charcoal">{s.name}</span>
                  {s.price
                    ? <span className="text-sm font-semibold text-sage">₺{s.price}</span>
                    : basePrice
                    ? <span className="text-sm font-semibold text-sage">₺{basePrice}</span>
                    : <span className="text-xs text-muted">Bilgi için iletişime geçin</span>
                  }
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mobil sticky CTA */}
        <div className="sticky bottom-4 sm:hidden mb-4">
          <Link href={`/${slug}/booking`}
            className="btn-primary w-full justify-center py-4 text-base font-semibold shadow-xl">
            📅 Hemen Randevu Al
          </Link>
        </div>

        <div className="text-center py-8 text-xs text-muted">
          <p>Üye olmak gerekmez · Bilgileriniz gizli tutulur</p>
          <p className="mt-1 opacity-40">Powered by PsikoPanel</p>
        </div>
      </div>
    </main>
  )
}
