// app/api/finance/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  let query = supabase
    .from('finance_entries')
    .select('*')
    .eq('psychologist_id', user.id)
    .order('entry_date', { ascending: false })

  if (month) {
    query = query
      .gte('entry_date', `${month}-01`)
      .lte('entry_date', `${month}-31`)
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
  const { type, amount, description, entry_date, appointment_id } = body

  if (!type || !amount || !description) {
    return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('finance_entries')
    .insert({
      psychologist_id: user.id,
      type,
      amount: parseInt(amount),
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
  if (amount      !== undefined) updates.amount      = parseInt(amount)
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
