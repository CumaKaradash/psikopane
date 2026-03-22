// app/api/homework/responses/route.ts — public endpoint, rate limited
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_PRESETS } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rl = checkRateLimit(req, RATE_PRESETS.homeworkResponse)
  if (!rl.success) {
    return NextResponse.json({ error: rl.error }, { status: 429, headers: rl.headers })
  }

  const body = await req.json()
  const { homework_id, respondent_name, answers } = body

  if (!homework_id || !answers) {
    return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const insertData = {
    homework_id:     homework_id,
    respondent_name: respondent_name !== undefined ? respondent_name : null,
    answers:         answers,
  }

  const { data, error } = await supabase
    .from('homework_responses')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const res = NextResponse.json(data, { status: 201 })
  Object.entries(rl.headers).forEach(([k, v]) => res.headers.set(k, v))
  return res
}
