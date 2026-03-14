// app/api/profile/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
  const {
    full_name, title, email, bio,
    slug, avatar_url,
    session_types, session_price, phone,
  } = body

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
  if (avatar_url    !== undefined) updates.avatar_url    = avatar_url
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
