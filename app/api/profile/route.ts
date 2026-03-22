// app/api/profile/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ProfileSchema } from '@/lib/schemas'

// GET — mevcut profili döndür
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — profil güncelle
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = ProfileSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' }, { status: 400 })

  const {
    full_name, title, email, bio,
    slug, avatar_url,
    session_types, session_price, phone,
  } = parsed.data

  // Slug değişiyorsa benzersizlik kontrolü
  if (slug) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
      .neq('id', user.id)

    if ((count ?? 0) > 0)
      return NextResponse.json(
        { error: 'Bu URL adresi başka bir psikolog tarafından kullanılıyor' },
        { status: 409 }
      )
  }

  const updates: Record<string, unknown> = {}
  if (full_name     !== undefined) updates.full_name     = full_name
  if (title         !== undefined) updates.title         = title
  if (email         !== undefined) updates.email         = email
  if (bio           !== undefined) updates.bio           = bio
  if (slug          !== undefined) updates.slug          = slug
  if (avatar_url    !== undefined) {
    // Güvenlik: yalnızca https:// URL'lerine izin ver (javascript: / data: URI'ları engelle)
    if (avatar_url !== null && avatar_url !== '') {
      try {
        const parsed = new URL(avatar_url)
        if (parsed.protocol !== 'https:')
          return NextResponse.json({ error: 'Avatar URL yalnızca https:// ile başlamalıdır' }, { status: 400 })
      } catch {
        return NextResponse.json({ error: 'Geçersiz avatar URL formatı' }, { status: 400 })
      }
    }
    updates.avatar_url = avatar_url || null
  }
  if (session_types !== undefined) updates.session_types = session_types
  if (session_price !== undefined) updates.session_price = Number(session_price)
  if (phone         !== undefined) updates.phone         = phone

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
