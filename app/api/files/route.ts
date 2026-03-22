// app/api/files/route.ts — Dosya listesi (takım desteğiyle)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teamId   = searchParams.get('team_id')
  const memberId = searchParams.get('member_id')

  if (teamId) {
    // Takım üyeliğini doğrula
    const { data: membership } = await supabase.from('team_members').select('id')
      .eq('team_id', teamId).eq('psychologist_id', user.id).eq('status', 'accepted').single()
    const { data: teamOwner } = await supabase.from('teams').select('id')
      .eq('id', teamId).eq('owner_id', user.id).single()
    if (!membership && !teamOwner)
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })

    const { data: members } = await supabase.from('team_members').select('psychologist_id')
      .eq('team_id', teamId).eq('status', 'accepted')
    const memberIds = (members ?? []).map(m => m.psychologist_id)

    let query = supabase.from('files').select('*')
      .in('psychologist_id', memberIds.length > 0 ? memberIds : ['__none__'])
      .eq('team_shared', true)
      .order('created_at', { ascending: false })

    if (memberId) query = query.eq('psychologist_id', memberId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Bireysel mod
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('psychologist_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — team_shared toggle (bireysel dosyayı takıma aç/kapat)
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, team_shared } = body
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  const { data, error } = await supabase
    .from('files')
    .update({ team_shared })
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — dosya sil (storage + db kaydı)
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id   = searchParams.get('id')
  const path = searchParams.get('path')
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  // Sahiplik kontrolü
  const { data: file, error: findErr } = await supabase
    .from('files').select('id, storage_path')
    .eq('id', id).eq('psychologist_id', user.id).single()

  if (findErr || !file)
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 })

  // Storage'dan sil
  const storagePath = path || file.storage_path
  if (storagePath) {
    await supabase.storage.from('psychologist-documents').remove([storagePath])
  }

  // DB kaydını sil
  const { error } = await supabase.from('files').delete()
    .eq('id', id).eq('psychologist_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
