// app/panel/calendar/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'
import CalendarClient from '@/components/panel/CalendarClient'

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const nowUTC   = new Date()
  const todayStr = format(new Date(nowUTC.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })), 'yyyy-MM-dd')

  const sp = await searchParams
  const [year, month] = sp.month
    ? sp.month.split('-').map(Number)
    : [parseInt(todayStr.slice(0, 4)), parseInt(todayStr.slice(5, 7))]

  const viewDate   = new Date(year, month - 1, 1)
  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)

  const [{ data: appointments }, { data: todayAppts }, { data: pendingAppts }] = await Promise.all([
    // Ay görünümü — confirmed + completed (takvimde göster)
    supabase.from('appointments')
      .select('id, starts_at, duration_min, session_type, status, guest_name, guest_phone, guest_email, guest_note, notes, client:clients(full_name)')
      .eq('psychologist_id', user.id)
      .in('status', ['confirmed', 'completed'])
      .gte('starts_at', monthStart.toISOString())
      .lte('starts_at', monthEnd.toISOString())
      .order('starts_at'),

    // Bugünün tüm randevuları (pending dahil)
    supabase.from('appointments')
      .select('id, starts_at, duration_min, session_type, status, guest_name, guest_phone, guest_email, guest_note, notes, client:clients(full_name)')
      .eq('psychologist_id', user.id)
      .not('status', 'eq', 'cancelled')
      .gte('starts_at', new Date(`${todayStr}T00:00:00+03:00`).toISOString())
      .lte('starts_at', new Date(`${todayStr}T23:59:59+03:00`).toISOString())
      .order('starts_at'),

    // Tüm bekleyen randevular (tarihten bağımsız)
    supabase.from('appointments')
      .select('id, starts_at, duration_min, session_type, status, guest_name, guest_phone, guest_email, guest_note, notes, client:clients(full_name)')
      .eq('psychologist_id', user.id)
      .eq('status', 'pending')
      .order('starts_at'),
  ])

  const prevMonth    = format(subMonths(viewDate, 1), 'yyyy-MM')
  const nextMonth    = format(addMonths(viewDate, 1), 'yyyy-MM')
  const currentMonth = format(viewDate, 'MMMM yyyy', { locale: tr })

  // Supabase join bazen dizi döndürür, normalize et
  function normalizeAppts(data: any[] | null) {
    return (data ?? []).map((a: any) => ({
      ...a,
      client: Array.isArray(a.client) ? (a.client[0] ?? null) : a.client,
    }))
  }

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3 pl-10 md:pl-0">
          <h2 className="font-serif text-xl">Takvim</h2>
          {(pendingAppts?.length ?? 0) > 0 && (
            <span className="text-xs bg-orange-400 text-white rounded-full px-2 py-0.5 font-semibold animate-pulse">
              {pendingAppts!.length} bekliyor
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a href={`/panel/calendar?month=${prevMonth}`} className="btn-outline py-1.5 px-3 text-xs">‹ Önceki</a>
          <span className="font-semibold text-sm px-3 min-w-[140px] text-center capitalize">{currentMonth}</span>
          <a href={`/panel/calendar?month=${nextMonth}`} className="btn-outline py-1.5 px-3 text-xs">Sonraki ›</a>
        </div>
      </header>

      <CalendarClient
        appointments={normalizeAppts(appointments)}
        todayAppts={normalizeAppts(todayAppts)}
        pendingAppts={normalizeAppts(pendingAppts)}
        viewDate={{ year, month }}
        today={todayStr}
      />
    </>
  )
}
