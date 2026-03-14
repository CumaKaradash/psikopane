'use client'
// components/panel/DashboardClient.tsx

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Calendar, TrendingUp, Users, Clock, ChevronRight } from 'lucide-react'
import MiniCalendar from './MiniCalendar'
import ArchiveCard  from './ArchiveCard'

interface TodayAppt {
  id: string
  starts_at: string
  session_type: string
  duration_min: number
  status: string
  guest_name: string | null
  client?: { full_name: string } | null
}

interface Props {
  todayAppts:       TodayAppt[]
  monthAppts:       TodayAppt[]
  upcomingAppts:    TodayAppt[]   // yeni prop — önümüzdeki 7 gün
  totalClients:     number
  pendingAppts:     number
  income:           number
  expense:          number
  today:            Date
  testResponses:    any[]
  homeworkResponses:any[]
  clients:          any[]
  testTitles:       Record<string, string>
  homeworkTitles:   Record<string, string>
}

const STATUS: Record<string, { text: string; cls: string }> = {
  pending:   { text: 'Bekliyor',   cls: 'pill-orange' },
  confirmed: { text: 'Onaylı',     cls: 'pill-green'  },
  completed: { text: 'Tamamlandı', cls: 'pill-sage'   },
  cancelled: { text: 'İptal',      cls: 'pill-orange' },
}

export default function DashboardClient({
  todayAppts, monthAppts, upcomingAppts,
  totalClients, pendingAppts,
  income, expense, today,
  testResponses, homeworkResponses, clients,
  testTitles, homeworkTitles,
}: Props) {
  const [detailModal, setDetailModal] = useState<string | null>(null)
  const [isClient,    setIsClient]    = useState(false)

  useEffect(() => { setIsClient(true) }, [])

  const net = income - expense
  const monthLabel = format(today, 'MMMM', { locale: tr })

  const stats = [
    {
      key:    'today',
      label:  'Bugünkü Randevular',
      value:  todayAppts.length,
      sub:    `${pendingAppts} onay bekliyor`,
      icon:   Calendar,
      color:  'text-blue-600',
      bg:     'bg-blue-50',
      href:   '/panel/calendar',
    },
    {
      key:    'clients',
      label:  'Aktif Danışanlar',
      value:  totalClients,
      sub:    'Toplam kayıtlı',
      icon:   Users,
      color:  'text-sage',
      bg:     'bg-sage-pale',
      href:   '/panel/clients',
    },
    {
      key:    'income',
      label:  `${monthLabel} Geliri`,
      value:  `₺${income.toLocaleString('tr-TR')}`,
      sub:    `Net ₺${net.toLocaleString('tr-TR')}`,
      icon:   TrendingUp,
      color:  net >= 0 ? 'text-green-600' : 'text-red-500',
      bg:     net >= 0 ? 'bg-green-50' : 'bg-red-50',
      href:   '/panel/finance',
    },
    {
      key:    'upcoming',
      label:  'Yaklaşan (7 gün)',
      value:  upcomingAppts.length,
      sub:    'Onaylı & bekleyen',
      icon:   Clock,
      color:  'text-purple-600',
      bg:     'bg-purple-50',
      href:   '/panel/calendar',
    },
  ]

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">

        {/* Stat kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <a key={s.key} href={s.href}
                className="card p-4 md:p-5 hover:shadow-md transition-shadow group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon size={16} className={s.color} />
                  </div>
                  <ChevronRight size={14} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
                <p className="font-serif text-2xl md:text-3xl leading-none mb-1">{s.value}</p>
                <p className="text-[11px] font-bold text-muted uppercase tracking-wide">{s.label}</p>
                <p className="text-[11px] text-muted mt-0.5">{s.sub}</p>
              </a>
            )
          })}
        </div>

        {/* Ana içerik */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Sol sütun — program + yaklaşan */}
          <div className="lg:col-span-2 space-y-5">

            {/* Bugünün programı */}
            <div className="card">
              <div className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold">Bugünün Programı</h3>
                <a href="/panel/calendar" className="text-xs text-sage hover:underline flex items-center gap-0.5">
                  Takvim <ChevronRight size={12} />
                </a>
              </div>
              {todayAppts.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Calendar size={28} className="mx-auto text-muted opacity-30 mb-2" />
                  <p className="text-sm text-muted">Bugün randevu yok</p>
                </div>
              ) : (
                <ul>
                  {todayAppts.map(appt => {
                    const s = STATUS[appt.status] ?? STATUS.pending
                    const name = appt.client?.full_name ?? appt.guest_name ?? '—'
                    return (
                      <li key={appt.id}
                        className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border/60 last:border-0 hover:bg-cream/40 transition-colors">
                        <div className="flex flex-col items-center w-10 flex-shrink-0">
                          <span className="text-xs font-bold text-sage">
                            {format(new Date(appt.starts_at), 'HH:mm')}
                          </span>
                          <span className="text-[10px] text-muted">{appt.duration_min}dk</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-xs text-muted">{appt.session_type}</p>
                        </div>
                        <span className={`${s.cls} flex-shrink-0`}>{s.text}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Yaklaşan randevular */}
            {upcomingAppts.length > 0 && (
              <div className="card">
                <div className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Yaklaşan Randevular</h3>
                  <span className="text-xs text-muted">Önümüzdeki 7 gün</span>
                </div>
                <ul>
                  {upcomingAppts.slice(0, 6).map(appt => {
                    const s    = STATUS[appt.status] ?? STATUS.pending
                    const name = appt.client?.full_name ?? appt.guest_name ?? '—'
                    const apptDate = new Date(appt.starts_at)
                    const isToday  = format(apptDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                    return (
                      <li key={appt.id}
                        className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 border-b border-border/60 last:border-0 hover:bg-cream/40 transition-colors">
                        <div className="flex flex-col items-center w-12 flex-shrink-0">
                          <span className="text-[10px] font-bold text-muted uppercase">
                            {isToday ? 'Bugün' : format(apptDate, 'EEE', { locale: tr })}
                          </span>
                          <span className="text-xs font-bold text-sage">
                            {format(apptDate, 'HH:mm')}
                          </span>
                          <span className="text-[10px] text-muted">
                            {format(apptDate, 'd MMM', { locale: tr })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-xs text-muted">{appt.session_type}</p>
                        </div>
                        <span className={`${s.cls} flex-shrink-0`}>{s.text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Arşiv özet kartı */}
            <ArchiveCard
              testResponses={testResponses}
              homeworkResponses={homeworkResponses}
              clients={clients}
              testTitles={testTitles}
              homeworkTitles={homeworkTitles}
            />
          </div>

          {/* Sağ sütun — mini takvim */}
          <div>
            <MiniCalendar
              appointments={monthAppts}
              today={today}
              onDayClick={date => {
                window.location.href = `/panel/calendar?date=${format(date, 'yyyy-MM-dd')}`
              }}
            />

            {/* Bu ay finans özeti */}
            <div className="card p-5 mt-4">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">
                {monthLabel} Finans
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Gelir', value: income,  color: 'text-green-600', bar: 'bg-green-400' },
                  { label: 'Gider', value: expense, color: 'text-red-500',   bar: 'bg-red-400'   },
                ].map(item => {
                  const pct = income > 0 ? Math.min(100, Math.round((item.value / income) * 100)) : 0
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted">{item.label}</span>
                        <span className={`text-xs font-semibold ${item.color}`}>
                          ₺{item.value.toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div className={`h-full ${item.bar} rounded-full transition-all`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted">Net</span>
                  <span className={`text-sm font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {net < 0 ? '-' : ''}₺{Math.abs(net).toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>
              <a href="/panel/finance"
                className="text-xs text-sage hover:underline mt-3 flex items-center gap-0.5">
                Tüm finans kayıtları <ChevronRight size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {detailModal && isClient && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDetailModal(null)}
              className="float-right text-muted text-xl leading-none">×</button>
            <p className="text-sm text-muted pt-2">Detaylar yakında eklenecek.</p>
          </div>
        </div>
      )}
    </>
  )
}
