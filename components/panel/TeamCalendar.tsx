'use client'
// components/panel/TeamCalendar.tsx

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Check, X, Clock, CheckCircle2, Calendar, Plus, ChevronRight } from 'lucide-react'

interface Appt {
  id: string
  starts_at: string
  duration_min: number
  session_type: string
  status: string
  guest_name: string | null
  guest_phone?: string | null
  guest_email?: string | null
  guest_note?: string | null
  notes?: string | null
  client?: { full_name: string } | null
  psychologist?: {
    id: string
    full_name: string
    title: string
    slug: string
  }
}

interface Props {
  teamId: string
}

const STATUS_CFG: Record<string, { text: string; cls: string; dot: string }> = {
  pending:   { text: 'Bekliyor',    cls: 'pill-orange', dot: 'bg-orange-400' },
  confirmed: { text: 'Onaylı',      cls: 'pill-green',  dot: 'bg-green-500'  },
  completed: { text: 'Tamamlandı', cls: 'pill-sage',   dot: 'bg-sage'       },
  cancelled: { text: 'İptal',       cls: 'pill-orange', dot: 'bg-gray-400'   },
}

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function TeamCalendar({ teamId }: Props) {
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [todayAppts, setTodayAppts] = useState<Appt[]>([])
  const [pendingAppts, setPendingAppts] = useState<Appt[]>([])
  const [viewDate, setViewDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const [today, setToday] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeamAppointments()
  }, [teamId, viewDate])

  async function fetchTeamAppointments() {
    try {
      setLoading(true)
      const monthStart = new Date(viewDate.year, viewDate.month, 1).toISOString()
      const monthEnd = new Date(viewDate.year, viewDate.month + 1, 0).toISOString()
      
      const res = await fetch(`/api/appointments?team_id=${teamId}&from=${monthStart}&to=${monthEnd}`)
      const data = await res.json()
      
      if (res.ok) {
        setAppointments(data || [])
        
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        setToday(todayStr)
        
        const today = data.filter((a: Appt) => 
          a.starts_at.startsWith(todayStr)
        ) || []
        setTodayAppts(today)
        
        const pending = data.filter((a: Appt) => a.status === 'pending') || []
        setPendingAppts(pending)
      } else {
        toast.error(data.error || 'Randevular yüklenemedi')
      }
    } catch (err) {
      toast.error('Randevular yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function getDaysInMonth() {
    return new Date(viewDate.year, viewDate.month + 1, 0).getDate()
  }

  function getFirstDayOfMonth() {
    return new Date(viewDate.year, viewDate.month, 1).getDay()
  }

  function getAppointmentsForDay(day: number) {
    const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return appointments.filter(a => a.starts_at.startsWith(dateStr))
  }

  function changeMonth(direction: number) {
    setViewDate(prev => {
      let newMonth = prev.month + direction
      let newYear = prev.year
      
      if (newMonth < 0) {
        newMonth = 11
        newYear--
      } else if (newMonth > 11) {
        newMonth = 0
        newYear++
      }
      
      return { year: newYear, month: newMonth }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">{appointments.length}</p>
              <p className="text-xs text-muted">Bu Ay Randevu</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayAppts.length}</p>
              <p className="text-xs text-muted">Bugünkü Randevu</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingAppts.length}</p>
              <p className="text-xs text-muted">Bekleyen Randevu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Takvim */}
      <div className="card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(new Date(viewDate.year, viewDate.month), 'MMMM yyyy', { locale: tr })}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1 hover:bg-cream rounded"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-1 hover:bg-cream rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Takvim Grid */}
        <div className="p-5">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-muted py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: getFirstDayOfMonth() }, (_, i: number) => (
              <div key={`empty-${i}`} className="h-20" />
            ))}
            
            {Array.from({ length: getDaysInMonth() }, (_, i: number) => {
              const dayAppts = getAppointmentsForDay(i)
              const isToday = format(new Date(viewDate.year, viewDate.month, i), 'yyyy-MM-dd') === today
              
              return (
                <div
                  key={i}
                  className={`h-20 border border-border/40 p-1 overflow-hidden ${
                    isToday ? 'bg-sage/10' : 'hover:bg-cream/30'
                  }`}
                >
                  <div className="text-xs text-muted mb-1">{i}</div>
                  <div className="space-y-1">
                    {dayAppts.slice(0, 2).map((appt) => (
                      <div
                        key={appt.id}
                        className={`text-[10px] p-1 rounded truncate cursor-pointer ${
                          STATUS_CFG[appt.status]?.cls || 'pill-gray'
                        }`}
                        title={`${appt.psychologist?.full_name} - ${appt.session_type}`}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[appt.status]?.dot || 'bg-gray-400'}`} />
                          <span className="truncate">
                            {appt.guest_name || appt.client?.full_name || 'Randevu'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <div className="text-[10px] text-muted">+{dayAppts.length - 2}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
