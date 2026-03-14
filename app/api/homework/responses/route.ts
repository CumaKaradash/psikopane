// app/api/homework/responses/route.ts  — public endpoint, rate limited
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, homeworkResponseRateLimit, RATE_OPTS } from '@/lib/upstash-rate-limit'

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, homeworkResponseRateLimit, RATE_OPTS.homeworkResponse)
  if (!rl.success) {
    return NextResponse.json({ error: rl.error }, { status: 429, headers: rl.headers })
  }

  const body = await req.json()
  const { homework_id, respondent_name, answers } = body
  if (!homework_id || !answers)
    return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('homework_responses')
    .insert({ homework_id, respondent_name: respondent_name ?? null, answers })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const res = NextResponse.json(data, { status: 201 })
  Object.entries(rl.headers).forEach(([k, v]) => res.headers.set(k, v))
  return res
}
