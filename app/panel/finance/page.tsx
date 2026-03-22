// app/panel/finance/page.tsx
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import FinanceClient from '@/components/panel/FinanceClient'

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date()
  const sp = await searchParams
  const month = sp.month ?? format(today, 'yyyy-MM')
  const [y, m] = month.split('-').map(Number)
  // Ayın son günü doğru hesaplanıyor (Şubat dahil)
  const lastDay = new Date(y, m, 0).getDate()
  const monthStart = `${month}-01`
  const monthEnd   = `${month}-${String(lastDay).padStart(2, '0')}`

  const { data: entries } = await supabase
    .from('finance_entries')
    .select('*')
    .eq('psychologist_id', user.id)
    .gte('entry_date', monthStart)
    .lte('entry_date', monthEnd)
    .order('entry_date', { ascending: false })

  const income  = (entries ?? []).filter(e => e.type === 'income').reduce((s, e)  => s + e.amount, 0)
  const expense = (entries ?? []).filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const monthLabel = format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: tr })

  const prevMonth = format(new Date(y, m - 2, 1), 'yyyy-MM')
  const nextMonth = format(new Date(y, m, 1), 'yyyy-MM')

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40 flex items-center justify-between">
        <h2 className="font-serif text-xl pl-10 md:pl-0">Ön Muhasebe</h2>
        <div className="flex items-center gap-2">
          <a href={`/panel/finance?month=${prevMonth}`} className="btn-outline py-1.5 px-3 text-xs">‹</a>
          <span className="font-semibold text-sm px-2 capitalize min-w-[120px] text-center">{monthLabel}</span>
          <a href={`/panel/finance?month=${nextMonth}`} className="btn-outline py-1.5 px-3 text-xs">›</a>
        </div>
      </header>
      <FinanceClient entries={entries ?? []} income={income} expense={expense} currentMonth={month} />
    </>
  )
}
