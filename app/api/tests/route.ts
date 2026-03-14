import type { SupabaseClient } from '@supabase/supabase-js'
// app/api/tests/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── Slug yardımcısı ───────────────────────────────────────────────────────────
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// ── Benzersiz slug üretici (DB çakışmasına karşı retry) ──────────────────────
async function generateUniqueSlug(
  supabase: SupabaseClient,
  baseSlug: string,
  psychologistId: string,
  maxTries = 5
): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    // İlk denemede sadece timestamp suffix, sonrakilerde ek rastgele karakter
    const suffix = i === 0
      ? Date.now().toString(36)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
    const candidate = `${baseSlug}-${suffix}`

    const { count } = await supabase
      .from('tests')
      .select('id', { count: 'exact', head: true })
      .eq('psychologist_id', psychologistId)
      .eq('slug', candidate)

    if ((count ?? 0) === 0) return candidate
  }
  // Son çare: tam rastgele
  return `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ── GET ───────────────────────────────────────────────────────────────────────
// GET /api/tests              → kullanıcının testleri
// GET /api/tests?community=1  → is_public=true olanlar (başkalarının)
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const community = searchParams.get('community') === '1'

  if (community) {
    const { data, error } = await supabase
      .from('tests')
      .select(`
        id, title, description, questions, slug,
        psychologist_id, created_at, is_active, is_public,
        author:profiles!psychologist_id(id, full_name, title, slug)
      `)
      .eq('is_public', true)
      .neq('psychologist_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('tests')
    .select('*, responses:test_responses(count)')
    .eq('psychologist_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // ── Klonlama: { action: 'clone', source_id } ─────────────────────────────
  if (body.action === 'clone') {
    const { source_id } = body
    if (!source_id)
      return NextResponse.json({ error: 'source_id zorunlu' }, { status: 400 })

    // Kaynağı al — is_public kontrolü zorunlu (başkalarının özel testi klonlanamaz)
    const { data: source, error: srcErr } = await supabase
      .from('tests')
      .select('id, title, description, questions, psychologist_id')
      .eq('id', source_id)
      .eq('is_public', true)          // SADECE public testler klonlanabilir
      .neq('psychologist_id', user.id) // Kendi testini klonlayamaz
      .single()

    if (srcErr || !source)
      return NextResponse.json(
        { error: 'Test bulunamadı, herkese açık değil veya size ait' },
        { status: 404 }
      )

    // Benzersiz slug garantisi
    const baseSlug = toSlug(source.title) || 'test'
    const uniqueSlug = await generateUniqueSlug(supabase, baseSlug, user.id)

    const { data, error } = await supabase
      .from('tests')
      .insert({
        psychologist_id: user.id,
        slug:            uniqueSlug,
        title:           `${source.title} (Klonlandı)`,
        description:     source.description ?? null,
        questions:       source.questions   ?? [],
        is_active:       false,   // pasif başlar, aktifleştirmek kullanıcıya kalır
        is_public:       false,   // özel olarak kopyalanır
      })
      .select()
      .single()

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
  }

  // ── Normal test oluşturma ─────────────────────────────────────────────────
  const { slug, title, description, questions, is_public } = body
  if (!slug || !title)
    return NextResponse.json({ error: 'Slug ve başlık zorunlu' }, { status: 400 })

  const { data, error } = await supabase
    .from('tests')
    .insert({
      psychologist_id: user.id,
      slug,
      title,
      description: description ?? null,
      questions:   questions   ?? [],
      is_public:   is_public   ?? false,
    })
    .select()
    .single()

  if (error) {
    const msg = error.message.includes('unique')
      ? 'Bu URL kısaltması zaten kullanılıyor'
      : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  // Güvenlik: psychologist_id filtrelemesi ile sadece kendi testini güncelleyebilir
  const { data, error } = await supabase
    .from('tests')
    .update(updates)
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', id)
    .eq('psychologist_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
