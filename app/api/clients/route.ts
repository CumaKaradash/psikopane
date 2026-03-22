// app/api/clients/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ClientSchema } from '@/lib/schemas'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')

  let query = supabase
    .from('clients')
    .select(`
      id, psychologist_id, full_name, phone, email, birth_date, address,
      session_type, notes, status, created_at, updated_at,
      psychologist:profiles!psychologist_id(id, full_name, title, slug)
    `)
    .order('full_name')

  if (teamId) {
    // Takım üyelerinin danışanlarını getir
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('psychologist_id')
      .eq('team_id', teamId)
      .eq('status', 'accepted')
    
    const memberIds = teamMembers?.map(m => m.psychologist_id) || []
    query = query.in('psychologist_id', [...memberIds, user.id]) // Takım üyeleri + kendi danışanları
  } else {
    // Sadece kendi danışanlarını getir
    query = query.eq('psychologist_id', user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = ClientSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' }, { status: 400 })

  const { full_name, phone, email, birth_date, address, session_type, notes } = parsed.data

  const { data, error } = await supabase
    .from('clients')
    .insert({ psychologist_id: user.id, full_name, phone: phone || null, email: email || null, birth_date: birth_date || null, address: address || null, session_type: session_type || null, notes: notes || null, status: 'new' })
    .select('id, psychologist_id, full_name, phone, email, birth_date, address, session_type, notes, status, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, full_name, phone, email, birth_date, address, session_type, notes, status } = body
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  // 🔒 Yalnızca izin verilen alanları güncelle — psychologist_id asla değiştirilemez
  const updates: Record<string, unknown> = {}
  if (full_name    !== undefined) updates.full_name    = full_name
  if (phone        !== undefined) updates.phone        = phone
  if (email        !== undefined) updates.email        = email
  if (birth_date   !== undefined) updates.birth_date   = birth_date || null
  if (address      !== undefined) updates.address      = address    || null
  if (session_type !== undefined) updates.session_type = session_type
  if (notes        !== undefined) updates.notes        = notes
  if (status       !== undefined) updates.status       = status

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })

  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .select('id, psychologist_id, full_name, phone, email, birth_date, address, session_type, notes, status, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  // Güvenlik: Danışanın bu kullanıcıya ait olduğunu doğrula
  const { data: clientCheck, error: clientCheckError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .single()

  if (clientCheckError || !clientCheck)
    return NextResponse.json({ error: 'Danışan bulunamadı veya erişim yetkiniz yok' }, { status: 404 })

  // Danışana ait randevuları yalnızca bu psikologun kayıtlarında kontrol et
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('id')
    .eq('client_id', id)
    .eq('psychologist_id', user.id)  // 🔒 Yetki filtresi eklendi
    .limit(1)

  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 500 })
  if (appointments && appointments.length > 0) {
    // Danışanın randevuları varsa client_id bağlantısını temizle (sadece bu kullanıcının randevularında)
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ client_id: null })
      .eq('client_id', id)
      .eq('psychologist_id', user.id)  // 🔒 Yetki filtresi

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({
      message: 'Danışan silinemedi (randevuları olduğu için), ancak randevu bağlantıları temizlendi. Danışan bilgileri randevularda guest olarak kalır.'
    }, { status: 200 })
  }

  // Danışanı sil
  const { data, error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Danışan silindi' })
}
