// app/panel/calendar/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  startOfMonth, endOfMonth, startOfDay, endOfDay,
  format, getDay, getDaysInMonth, addMonths, subMonths
} from 'date-fns'
import { tr } from 'date-fns/locale'
import CalendarClient from '@/components/panel/CalendarClient'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Parse month from query param e.g. "2026-03"
  const today = new Date()
  const [year, month] = searchParams.month
    ? searchParams.month.split('-').map(Number)
    : [today.getFullYear(), today.getMonth() + 1]

  const viewDate  = new Date(year, month - 1, 1)
  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, starts_at, duration_min, session_type, status, guest_name, client:clients(full_name)')
    .eq('psychologist_id', user.id)
    .gte('starts_at', monthStart.toISOString())
    .lte('starts_at', monthEnd.toISOString())
    .order('starts_at')

  // Today's appointments for side panel
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('id, starts_at, duration_min, session_type, status, guest_name, client:clients(full_name)')
    .eq('psychologist_id', user.id)
    .gte('starts_at', startOfDay(today).toISOString())
    .lte('starts_at', endOfDay(today).toISOString())
    .order('starts_at')

  const prevMonth = format(subMonths(viewDate, 1), 'yyyy-MM')
  const nextMonth = format(addMonths(viewDate, 1), 'yyyy-MM')
  const currentMonth = format(viewDate, 'MMMM yyyy', { locale: tr })

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40 flex items-center justify-between">
        <h2 className="font-serif text-xl pl-10 md:pl-0">Takvim</h2>
        <div className="flex items-center gap-2">
          <a href={`/panel/calendar?month=${prevMonth}`}
            className="btn-outline py-1.5 px-3 text-xs">‹ Önceki</a>
          <span className="font-semibold text-sm px-3 min-w-[140px] text-center capitalize">
            {currentMonth}
          </span>
          <a href={`/panel/calendar?month=${nextMonth}`}
            className="btn-outline py-1.5 px-3 text-xs">Sonraki ›</a>
        </div>
      </header>

      <CalendarClient
        appointments={appointments ?? []}
        todayAppts={todayAppts ?? []}
        viewDate={{ year, month }}
        today={format(today, 'yyyy-MM-dd')}
      />
    </>
  )
}
