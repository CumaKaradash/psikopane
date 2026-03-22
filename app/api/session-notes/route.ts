// app/api/session-notes/route.ts
// Randevulara bağlı klinik seans notları — yalnızca psikolog erişebilir

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SessionNoteSchema } from '@/lib/schemas'

// GET /api/session-notes?appointment_id=...
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const appointment_id   = searchParams.get('appointment_id')
  if (!appointment_id)
    return NextResponse.json({ error: 'appointment_id zorunlu' }, { status: 400 })

  const { data, error } = await supabase
    .from('session_notes')
    .select('id, content, updated_at')
    .eq('appointment_id', appointment_id)
    .eq('psychologist_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') // PGRST116 = not found, normal
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? { content: '' })
}

// PUT /api/session-notes — oluştur veya güncelle (upsert)
export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = SessionNoteSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' }, { status: 400 })

  const { appointment_id, content } = parsed.data

  // Randevunun bu kullanıcıya ait olduğunu doğrula
  const { data: appt } = await supabase
    .from('appointments')
    .select('id')
    .eq('id', appointment_id)
    .eq('psychologist_id', user.id)
    .single()

  if (!appt)
    return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 })

  const { data, error } = await supabase
    .from('session_notes')
    .upsert({
      appointment_id,
      psychologist_id: user.id,
      content: content ?? '',
    }, { onConflict: 'appointment_id' })
    .select('id, content, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/session-notes?appointment_id=...
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const appointment_id   = searchParams.get('appointment_id')
  if (!appointment_id)
    return NextResponse.json({ error: 'appointment_id zorunlu' }, { status: 400 })

  const { error } = await supabase
    .from('session_notes')
    .delete()
    .eq('appointment_id', appointment_id)
    .eq('psychologist_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
