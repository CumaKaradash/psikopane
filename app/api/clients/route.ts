// app/api/clients/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')

  let query = supabase
    .from('clients')
    .select(`
      *,
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
  const { full_name, phone, email, session_type, notes } = body

  if (!full_name) return NextResponse.json({ error: 'Ad zorunlu' }, { status: 400 })

  const { data, error } = await supabase
    .from('clients')
    .insert({ psychologist_id: user.id, full_name, phone, email, session_type, notes, status: 'new' })
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
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
