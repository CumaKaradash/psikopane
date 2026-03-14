// app/[slug]/booking/page.tsx
// slug önce bireysel profillerde, yoksa takımlar tablosunda aranır.
// Takım ise üye psikologlar listelenir ve danışandan seçim istenir.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BookingForm from '@/components/client/BookingForm'
import type { PublicProfile, BookingContext } from '@/lib/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params: rawParams }: Props): Promise<import('next').Metadata> {
  const { slug: params } = await rawParams
  const supabase = await createClient()
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://psikopanel.tr'

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, title, bio, avatar_url')
    .eq('slug', params)
    .single()

  if (profile) {
    const name = profile.full_name
    const desc = `${name} ile randevu alın${profile.bio ? ` — ${profile.bio.slice(0, 100)}` : '.'}`
    const img  = profile.avatar_url ?? `${appUrl}/og-default.png`
    return {
      title:       `${name} — Randevu Al | PsikoPanel`,
      description: desc,
      openGraph: {
        title:       `${name} — Randevu Al`,
        description: desc,
        images:      [{ url: img, width: 400, height: 400, alt: name }],
        siteName:    'PsikoPanel',
        locale:      'tr_TR',
      },
      twitter: { card: 'summary', title: `${name} — Randevu Al`, images: [img] },
    }
  }

  const { data: team } = await supabase
    .from('teams')
    .select('name, description, avatar_url')
    .eq('slug', params)
    .single()

  if (team) {
    const desc = team.description ?? `${team.name} ile randevu alın.`
    const img  = team.avatar_url ?? `${appUrl}/og-default.png`
    return {
      title:       `${team.name} — Randevu Al | PsikoPanel`,
      description: desc,
      openGraph: {
        title:       `${team.name} — Randevu Al`,
        description: desc,
        images:      [{ url: img, width: 400, height: 400, alt: team.name }],
        siteName:    'PsikoPanel',
        locale:      'tr_TR',
      },
      twitter: { card: 'summary', title: `${team.name} — Randevu Al`, images: [img] },
    }
  }

  return { title: 'Randevu Al | PsikoPanel' }
}

export default async function BookingPage({ params: rawParams }: Props) {
  const supabase = await createClient()
  const { slug } = await rawParams

  // ── 1. Bireysel profil ────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, full_name, title, bio, session_types, session_price, avatar_url')
    .eq('slug', slug)
    .single()

  if (profile) {
    const ctx: BookingContext = {
      type:        'individual',
      profile:     profile as PublicProfile,
      team:        null,
      teamMembers: null,
    }

    return (
      <BookingPageLayout
        title={profile.full_name}
        subtitle={profile.title ?? ''}
        slug={slug}
        ctx={ctx}
      />
    )
  }

  // ── 2. Takım / Klinik ─────────────────────────────────────────────────────
  const { data: team } = await supabase
    .from('teams')
    .select('id, slug, name, description, session_types, avatar_url')
    .eq('slug', slug)
    .single()

  if (!team) notFound()

  // Takım üyelerini çek (psikolog profilleriyle birlikte)
  const { data: members } = await supabase
    .from('team_members')
    .select(`
      psychologist_id, role,
      profile:profiles!psychologist_id(
        id, slug, full_name, title, bio,
        session_types, session_price, avatar_url
      )
    `)
    .eq('team_id', team.id)
    .order('role')   // owner önce gelsin

  const teamMembers = (members ?? [])
    .filter(m => m.profile)
    .map(m => ({
      psychologist_id: m.psychologist_id,
      role:            m.role as 'owner' | 'member',
      profile:         m.profile as PublicProfile,
    }))

  const ctx: BookingContext = {
    type:        'team',
    profile:     null,
    team: {
      id:           team.id,
      slug:         team.slug,
      name:         team.name,
      description:  team.description ?? null,
      session_types: team.session_types ?? ['Bireysel Terapi', 'İlk Görüşme', 'Online Seans'],
      avatar_url:   team.avatar_url ?? null,
    },
    teamMembers,
  }

  return (
    <BookingPageLayout
      title={team.name}
      subtitle={`${teamMembers.length} uzman · Klinik Randevu`}
      slug={slug}
      ctx={ctx}
    />
  )
}

// ── Ortak sayfa iskeleti ───────────────────────────────────────────────────────
function BookingPageLayout({
  title, subtitle, slug, ctx,
}: {
  title:    string
  subtitle: string
  slug:     string
  ctx:      BookingContext
}) {
  const isTeam = ctx.type === 'team'

  return (
    <main className="min-h-screen bg-gradient-to-br from-sage-pale via-cream to-accent-l flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="bg-sage rounded-t-2xl px-8 py-8 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl mx-auto mb-4">
            {isTeam ? '🏥' : '🌿'}
          </div>
          <h1 className="font-serif text-2xl">{title}</h1>
          <p className="text-sm opacity-75 mt-1">{subtitle}</p>
          <p className="text-xs font-mono opacity-40 mt-2">
            .../{slug}/booking
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-2xl shadow-lg px-8 py-8">
          <BookingForm ctx={ctx} />
        </div>

        <p className="text-center text-xs text-muted mt-4">
          Üye olmak gerekmez · Bilgileriniz gizli tutulur
        </p>
      </div>
    </main>
  )
}
