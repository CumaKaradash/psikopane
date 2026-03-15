// app/api/tests/[id]/responses/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Test responses'ı getir
    const { data: responses, error } = await supabase
      .from('test_responses')
      .select('*')
      .eq('test_id', testId)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Test yanıtları alınamadı:', error)
      return NextResponse.json({ error: 'Test yanıtları alınamadı' }, { status: 500 })
    }

    return NextResponse.json(responses || [])
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
