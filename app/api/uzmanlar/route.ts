// app/api/uzmanlar/route.ts
// Public endpoint — kimlik doğrulama gerekmez
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q              = searchParams.get('q')?.trim()            // isim / unvan arama
  const sessionType    = searchParams.get('session_type')?.trim() // seans türü filtresi

  const supabase = await createClient()

  // Profilleri getir
  let profilesQuery = supabase
    .from('profiles')
    .select('id, slug, full_name, title, bio, session_types, session_price, avatar_url')
    // Yalnızca slug'ı tamamlanmış (setup yapılmış) profilleri göster
    .not('slug', 'is', null)
    .not('full_name', 'is', null)
    .neq('slug', '')
    // Yalnızca dizinde görünmeyi kabul etmiş profiller
    .eq('is_listed', true)
    .order('full_name', { ascending: true })

  // Takımları getir
  let teamsQuery = supabase
    .from('teams')
    .select('id, slug, name, description, bio, session_types, avatar_url')
    .not('slug', 'is', null)
    .not('name', 'is', null)
    .neq('slug', '')
    .order('name', { ascending: true })

  // İsim / unvan araması (büyük-küçük harf duyarsız)
  if (q) {
    profilesQuery = profilesQuery.or(`full_name.ilike.%${q}%,title.ilike.%${q}%`)
    teamsQuery = teamsQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
  }

  const [{ data: profilesData, error: profilesError }, { data: teamsData, error: teamsError }] = await Promise.all([
    profilesQuery,
    teamsQuery
  ])

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 })
  }

  // Seans türü filtresi (Supabase array contains)
  let profiles = profilesData ?? []
  if (sessionType) {
    profiles = profiles.filter((p) =>
      (p.session_types ?? []).some((t: string) =>
        t.toLowerCase().includes(sessionType.toLowerCase())
      )
    )
  }

  let teams = teamsData ?? []
  if (sessionType) {
    teams = teams.filter((t) =>
      (t.session_types ?? []).some((s: string) =>
        s.toLowerCase().includes(sessionType.toLowerCase())
      )
    )
  }

  // Profiller ve takımları birleştir
  const result = [
    ...profiles.map(p => ({ ...p, type: 'profile' })),
    ...teams.map(t => ({ ...t, type: 'team', full_name: t.name, title: 'Takım' }))
  ]

  return NextResponse.json(result)
}
