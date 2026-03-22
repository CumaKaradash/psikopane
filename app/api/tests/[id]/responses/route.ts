// app/api/tests/[id]/responses/route.ts
// Psikologun kendi testine ait yanıtlarını döndürür — kimlik doğrulama zorunlu

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: testId } = await params

    // Testin bu kullanıcıya ait olduğunu doğrula
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('id')
      .eq('id', testId)
      .eq('psychologist_id', user.id)
      .single()

    if (testErr || !test)
      return NextResponse.json({ error: 'Test bulunamadı veya erişim yetkiniz yok' }, { status: 404 })

    const { data: responses, error } = await supabase
      .from('test_responses')
      .select('*')
      .eq('test_id', testId)
      .order('completed_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(responses ?? [])
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
