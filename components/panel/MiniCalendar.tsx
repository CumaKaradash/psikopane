'use client'
// components/panel/MiniCalendar.tsx

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, getDay, getDaysInMonth, addMonths, subMonths } from 'date-fns'
import { localDateKey } from '@/lib/utils'
import { tr } from 'date-fns/locale'

interface Appt {
  id: string
  starts_at: string
  status: string
  session_type?: string
  duration_min?: number
  guest_name?: string | null
  client?: { full_name: string } | null
}

interface Props {
  appointments: Appt[]
  today: Date
  onViewMonth?: (date: Date) => void
  onDayClick?: (date: Date) => void
}

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function MiniCalendar({ appointments, today, onViewMonth, onDayClick }: Props) {
  const [viewDate, setViewDate] = useState(today)
  
  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const offset = (getDay(monthStart) + 6) % 7
  const daysInMonth = getDaysInMonth(viewDate)

  // Group appointments by day
  const byDay: Record<string, number> = {}
  for (const a of appointments) {
    const key = localDateKey(a.starts_at)
    byDay[key] = (byDay[key] || 0) + 1
  }

  const cells: { day: number | null; dateKey: string }[] = []
  for (let i = 0; i < offset; i++) cells.push({ day: null, dateKey: '' })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateKey })
  }

  function handlePrevMonth() {
    const newDate = subMonths(viewDate, 1)
    setViewDate(newDate)
    onViewMonth?.(newDate)
  }

  function handleNextMonth() {
    const newDate = addMonths(viewDate, 1)
    setViewDate(newDate)
    onViewMonth?.(newDate)
  }

  function handleDayClick(day: number | null) {
    if (!day) return
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    onDayClick?.(clickedDate)
  }

  const isToday = (dateKey: string) => {
    const todayKey = format(today, 'yyyy-MM-dd')
    return dateKey === todayKey
  }

  const hasAppointments = (dateKey: string) => {
    return byDay[dateKey] > 0
  }

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <button 
            onClick={handlePrevMonth}
            className="text-sage hover:text-sage-d transition-colors"
            title="Önceki ay">
            ‹
          </button>
          <h3 className="font-semibold text-sm">
            {format(viewDate, 'MMMM yyyy', { locale: tr })}
          </h3>
          <button 
            onClick={handleNextMonth}
            className="text-sage hover:text-sage-d transition-colors"
            title="Sonraki ay">
            ›
          </button>
        </div>
      </div>
      
      <div className="p-3">
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-muted uppercase">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell.day) return <div key={`empty-${i}`} className="aspect-square" />
            
            const today = isToday(cell.dateKey)
            const hasAppts = hasAppointments(cell.dateKey)
            const apptCount = byDay[cell.dateKey] || 0
            
            return (
              <button
                key={cell.dateKey}
                onClick={() => handleDayClick(cell.day)}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded text-xs
                  transition-all hover:bg-sage-pale/50
                  ${today ? 'bg-sage text-white font-bold' : 'text-charcoal'}
                  ${hasAppts && !today ? 'font-semibold' : ''}
                  ${!cell.day ? 'invisible' : ''}
                `}
                title={`${cell.day} ${format(viewDate, 'MMMM', { locale: tr })}${hasAppts ? ` - ${apptCount} randevu` : ''}`}
              >
                <span>{cell.day}</span>
                {hasAppts && (
                  <div className={`
                    w-1 h-1 rounded-full mt-0.5
                    ${today ? 'bg-white' : 'bg-sage'}
                  `} />
                )}
              </button>
            )
          })}
        </div>
        
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted">
            <div className="w-2 h-2 rounded-full bg-sage" />
            <span>Randevulu gün</span>
          </div>
          <button 
            onClick={() => window.location.href = '/panel/calendar'}
            className="text-xs text-sage hover:underline">
            Tam Takvim →
          </button>
        </div>
      </div>
    </div>
  )
}
