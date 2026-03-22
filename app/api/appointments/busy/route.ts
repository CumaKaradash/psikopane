// app/api/appointments/busy/route.ts
// Psikologun meşgul saatlerini public olarak döndürür (randevu formu için)
// Kişisel bilgi içermez — sadece starts_at listesi

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_PRESETS } from '@/lib/rate-limit'

export async function GET(req: Request) {
  // Rate limit — dakikada 30 istek
  const rl = checkRateLimit(req, RATE_PRESETS.busySlots)
  if (!rl.success)
    return NextResponse.json({ error: rl.error }, { status: 429, headers: rl.headers })

  const { searchParams } = new URL(req.url)
  const psychologist_id  = searchParams.get('psychologist_id')
  const from             = searchParams.get('from')
  const to               = searchParams.get('to')

  if (!psychologist_id)
    return NextResponse.json({ error: 'psychologist_id zorunlu' }, { status: 400 })

  const supabase = await createServiceClient()

  let q = supabase
    .from('appointments')
    .select('starts_at, duration_min')
    .eq('psychologist_id', psychologist_id)
    .in('status', ['pending', 'confirmed'])

  if (from) q = q.gte('starts_at', from)
  if (to)   q = q.lte('starts_at', to)

  const { data, error } = await q
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  // Yalnızca starts_at listesi döndür — kişisel bilgi yok
  const slots = (data ?? []).map(a => a.starts_at)

  const res = NextResponse.json(slots)
  Object.entries(rl.headers).forEach(([k, v]) => res.headers.set(k, v))
  // 60 sn CDN cache — hafif load
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
  return res
}
