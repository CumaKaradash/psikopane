// app/panel/page.tsx — Tüm veriler Supabase'den gerçek zamanlı
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  format, startOfDay, endOfDay,
  startOfWeek, endOfWeek, addDays,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import DashboardClient from '@/components/panel/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today     = new Date()
  const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
  const monthEnd   = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd')
  // Bu hafta + önümüzdeki 7 gün (yaklaşan randevular için)
  const weekStart  = startOfDay(today).toISOString()
  const weekEnd    = endOfDay(addDays(today, 7)).toISOString()

  const [
    { count: totalClients },
    { count: pendingAppts },
    { data: todayAppts },
    { data: monthAppts },
    { data: upcomingAppts },
    { data: recentMonth },
    { data: ownTests },
    { data: ownHw },
    { data: clients },
  ] = await Promise.all([
    // Aktif danışan sayısı
    supabase.from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('psychologist_id', user.id)
      .eq('status', 'active'),

    // Bekleyen onay
    supabase.from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('psychologist_id', user.id)
      .eq('status', 'pending'),

    // Bugünkü randevular
    supabase.from('appointments')
      .select('*, client:clients(full_name)')
      .eq('psychologist_id', user.id)
      .gte('starts_at', startOfDay(today).toISOString())
      .lte('starts_at', endOfDay(today).toISOString())
      .order('starts_at'),

    // Bu ayki tüm randevular (mini takvim için)
    supabase.from('appointments')
      .select('*, client:clients(full_name)')
      .eq('psychologist_id', user.id)
      .gte('starts_at', format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'))
      .lte('starts_at', format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd'))
      .order('starts_at'),

    // Önümüzdeki 7 günün randevuları (dashboard listesi)
    supabase.from('appointments')
      .select('*, client:clients(full_name)')
      .eq('psychologist_id', user.id)
      .in('status', ['pending', 'confirmed'])
      .gte('starts_at', weekStart)
      .lte('starts_at', weekEnd)
      .order('starts_at')
      .limit(10),

    // Bu ayın finans kayıtları
    supabase.from('finance_entries')
      .select('type, amount')
      .eq('psychologist_id', user.id)
      .gte('entry_date', monthStart)
      .lte('entry_date', monthEnd),

    // Psikologun testleri (arşiv için)
    supabase.from('tests').select('id, title, slug').eq('psychologist_id', user.id),

    // Psikologun ödevleri (arşiv için)
    supabase.from('homework').select('id, title, slug').eq('psychologist_id', user.id),

    // Danışan listesi (arşiv + mini liste için)
    supabase.from('clients')
      .select('id, full_name, created_at, status')
      .eq('psychologist_id', user.id)
      .order('full_name'),
  ])

  // Gelir / gider hesapla
  const income  = (recentMonth ?? []).filter(e => e.type === 'income').reduce((s, e)  => s + e.amount, 0)
  const expense = (recentMonth ?? []).filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

  // Test/ödev yanıtları (arşiv kartı için)
  const testIds = (ownTests ?? []).map(t => t.id)
  const hwIds   = (ownHw   ?? []).map(h => h.id)

  const [{ data: testResponses }, { data: hwResponses }] = await Promise.all([
    testIds.length > 0
      ? supabase.from('test_responses').select('*')
          .in('test_id', testIds)
          .order('completed_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    hwIds.length > 0
      ? supabase.from('homework_responses').select('*')
          .in('homework_id', hwIds)
          .order('completed_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ])

  const testMap = Object.fromEntries((ownTests ?? []).map(t => [t.id, t.title]))
  const hwMap   = Object.fromEntries((ownHw   ?? []).map(h => [h.id, h.title]))

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 pl-10 md:pl-0">
          <h2 className="font-serif text-xl">Gösterge Paneli</h2>
          <span className="text-sm text-muted">
            {format(today, 'd MMMM yyyy, EEEE', { locale: tr })}
          </span>
        </div>
      </header>

      <DashboardClient
        todayAppts={todayAppts       ?? []}
        monthAppts={monthAppts       ?? []}
        upcomingAppts={upcomingAppts ?? []}
        totalClients={totalClients   ?? 0}
        pendingAppts={pendingAppts   ?? 0}
        income={income}
        expense={expense}
        today={today}
        testResponses={testResponses ?? []}
        homeworkResponses={hwResponses ?? []}
        clients={clients             ?? []}
        testTitles={testMap}
        homeworkTitles={hwMap}
      />
    </>
  )
}
