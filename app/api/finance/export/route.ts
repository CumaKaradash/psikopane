// app/api/finance/export/route.ts
// Gelir/gider verilerini CSV olarak dışa aktar
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_PRESETS } from '@/lib/rate-limit'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Saatte 30 export hakkı
  const rl = checkRateLimit(req, RATE_PRESETS.financeExport)
  if (!rl.success)
    return NextResponse.json({ error: rl.error }, { status: 429, headers: rl.headers })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // Opsiyonel: "2025-03" formatında

  let query = supabase
    .from('finance_entries')
    .select('*')
    .eq('psychologist_id', user.id)
    .order('entry_date', { ascending: true })

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const lastDay = new Date(year, mon, 0).getDate()
    query = query
      .gte('entry_date', `${month}-01`)
      .lte('entry_date', `${month}-${String(lastDay).padStart(2, '0')}`)
  }

  const { data: entries, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // CSV satırları oluştur
  const header = ['Tarih', 'Tür', 'Açıklama', 'Tutar (₺)', 'Oluşturulma']
  const rows = (entries ?? []).map(e => [
    e.entry_date,
    e.type === 'income' ? 'Gelir' : 'Gider',
    `"${(e.description ?? '').replace(/"/g, '""')}"`, // İçindeki tırnak işaretlerini escape et
    e.amount.toFixed(2),
    new Date(e.created_at).toLocaleDateString('tr-TR'),
  ])

  // Özet satırları
  const income  = (entries ?? []).filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = (entries ?? []).filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net     = income - expense

  const csv = [
    header.join(','),
    ...rows.map(r => r.join(',')),
    '', // Boş ayıraç satırı
    `,,Toplam Gelir,${income.toFixed(2)},`,
    `,,Toplam Gider,${expense.toFixed(2)},`,
    `,,Net Bakiye,${net.toFixed(2)},`,
  ].join('\n')

  // BOM ile UTF-8 — Excel Türkçe karakterleri doğru okusun
  const bom = '\uFEFF'
  const filename = month
    ? `finans-${month}.csv`
    : `finans-tumu.csv`

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
