// app/api/finance/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { FinanceEntrySchema } from '@/lib/schemas'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month     = searchParams.get('month')
  const teamId    = searchParams.get('team_id')
  const memberId  = searchParams.get('member_id')

  // ── Takım modunda: tüm kabul edilmiş üyelerin kayıtlarını getir ──────────
  if (teamId) {
    // Kullanıcının bu takımda kabul edilmiş üye olduğunu doğrula
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('psychologist_id', user.id)
      .eq('status', 'accepted')
      .single()

    // Takım sahibi de erişebilir
    const { data: teamOwner } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('owner_id', user.id)
      .single()

    if (!membership && !teamOwner)
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })

    // Takımdaki kabul edilmiş tüm üyelerin ID'lerini al
    const { data: members } = await supabase
      .from('team_members')
      .select('psychologist_id')
      .eq('team_id', teamId)
      .eq('status', 'accepted')

    const memberIds = (members ?? []).map(m => m.psychologist_id)

    let query = supabase
      .from('finance_entries')
      .select('*')
      .in('psychologist_id', memberIds.length > 0 ? memberIds : ['__none__'])
      .order('entry_date', { ascending: false })

    if (memberId) query = query.eq('psychologist_id', memberId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // ── Bireysel mod ──────────────────────────────────────────────────────────
  let query = supabase
    .from('finance_entries')
    .select('*')
    .eq('psychologist_id', user.id)
    .order('entry_date', { ascending: false })

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const lastDay = new Date(year, mon, 0).getDate()
    query = query
      .gte('entry_date', `${month}-01`)
      .lte('entry_date', `${month}-${String(lastDay).padStart(2, '0')}`)
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
  const parsed = FinanceEntrySchema.safeParse({ ...body, amount: parseFloat(body.amount) })
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' }, { status: 400 })

  const { type, amount, description, entry_date, appointment_id } = parsed.data

  const { data, error } = await supabase
    .from('finance_entries')
    .insert({
      psychologist_id: user.id,
      type,
      amount: parseFloat(amount.toFixed(2)),
      description,
      entry_date: entry_date || new Date().toISOString().split('T')[0],
      appointment_id: appointment_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, type, amount, description, entry_date } = body
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (type        !== undefined) updates.type        = type
  if (amount      !== undefined) updates.amount      = parseFloat(parseFloat(amount).toFixed(2))
  if (description !== undefined) updates.description = description
  if (entry_date  !== undefined) updates.entry_date  = entry_date

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })

  const { data, error } = await supabase
    .from('finance_entries')
    .update(updates)
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .select()
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

  const { error } = await supabase
    .from('finance_entries')
    .delete()
    .eq('id', id)
    .eq('psychologist_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
