// app/api/homework/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const HomeworkSchema = z.object({
  title:       z.string().min(2, 'Başlık en az 2 karakter olmalı').max(200),
  slug:        z.string().regex(/^[a-z0-9-]+$/).min(2).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  due_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  questions:   z.array(z.object({ text: z.string().min(1).max(500) })).optional(),
  is_active:   z.boolean().optional(),
})

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teamId   = searchParams.get('team_id')
  const memberId = searchParams.get('member_id')

  if (teamId) {
    const { data: membership } = await supabase.from('team_members').select('id')
      .eq('team_id', teamId).eq('psychologist_id', user.id).eq('status', 'accepted').single()
    const { data: teamOwner } = await supabase.from('teams').select('id')
      .eq('id', teamId).eq('owner_id', user.id).single()
    if (!membership && !teamOwner)
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })

    const { data: members } = await supabase.from('team_members').select('psychologist_id')
      .eq('team_id', teamId).eq('status', 'accepted')
    const memberIds = (members ?? []).map(m => m.psychologist_id)

    let query = supabase.from('homework').select('*')
      .in('psychologist_id', memberIds.length > 0 ? memberIds : ['__none__'])
      .eq('team_shared', true)
      .order('created_at', { ascending: false })

    if (memberId) query = query.eq('psychologist_id', memberId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('homework')
    .select('*, responses:homework_responses(count)')
    .eq('psychologist_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = HomeworkSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' }, { status: 400 })

  const { slug, title, description, questions, due_date } = { ...body, ...parsed.data }

  if (!slug || !title) return NextResponse.json({ error: 'Slug ve başlık zorunlu' }, { status: 400 })

  const { data, error } = await supabase
    .from('homework')
    .insert({
      psychologist_id: user.id,
      slug,
      title,
      description: description || null,
      questions:   questions   || [],
      due_date:    due_date    || null,
    })
    .select()
    .single()

  if (error) {
    const msg = error.message.includes('unique') ? 'Bu URL kısaltması zaten kullanılıyor' : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  const { data, error } = await supabase
    .from('homework')
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
    .from('homework')
    .delete()
    .eq('id', id)
    .eq('psychologist_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
