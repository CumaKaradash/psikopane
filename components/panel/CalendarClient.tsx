'use client'
// components/panel/CalendarClient.tsx — Mobil responsive

import { useState } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Appt {
  id: string
  starts_at: string
  duration_min: number
  session_type: string
  status: string
  guest_name: string | null
  client?: { full_name: string } | null
}

interface Props {
  appointments: Appt[]
  todayAppts: Appt[]
  viewDate: { year: number; month: number }
  today: string
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:   { text: 'Bekliyor',   cls: 'pill-orange' },
  confirmed: { text: 'Onaylı',     cls: 'pill-green'  },
  completed: { text: 'Tamamlandı', cls: 'pill-sage'   },
  cancelled: { text: 'İptal',      cls: 'pill-orange' },
}

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function CalendarClient({ appointments, todayAppts, viewDate, today }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    guest_name: '', session_type: 'Bireysel Terapi',
    starts_at: '', duration_min: '50', notes: '',
  })
  const [loading, setLoading] = useState(false)
  // Mobilde takvim / bugün arasında geçiş
  const [mobileTab, setMobileTab] = useState<'calendar' | 'today'>('calendar')

  const { year, month } = viewDate
  const firstDay = new Date(year, month - 1, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const byDay: Record<string, Appt[]> = {}
  for (const a of appointments) {
    const key = a.starts_at.slice(0, 10)
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(a)
  }

  function getName(a: Appt) {
    return a.client?.full_name ?? a.guest_name ?? '—'
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.guest_name || !form.starts_at) { toast.error('İsim ve saat zorunlu'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name:   form.guest_name,
          guest_phone:  null,
          session_type: form.session_type,
          starts_at:    new Date(form.starts_at).toISOString(),
          duration_min: parseInt(form.duration_min),
          notes:        form.notes || null,
          _panel_add:   true,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Randevu eklendi!')
      setAddOpen(false)
      window.location.reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch('/api/appointments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) { toast.success('Güncellendi'); window.location.reload() }
    else toast.error('Güncelleme başarısız')
  }

  const cells: { day: number | null; dateKey: string }[] = []
  for (let i = 0; i < offset; i++) cells.push({ day: null, dateKey: '' })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateKey })
  }

  // ── Bugün paneli (paylaşımlı) ────────────────────────────────────────────
  const TodayPanel = () => (
    <div className="card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Bugün</h3>
        <p className="text-xs text-muted">{format(new Date(), 'd MMMM', { locale: tr })}</p>
      </div>
      {todayAppts.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted text-center">Bugün randevu yok</p>
      ) : (
        <ul>
          {todayAppts.map(a => (
            <li key={a.id} className="px-4 py-3 border-b border-border/60 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-sage">{format(new Date(a.starts_at), 'HH:mm')}</span>
                <span className={STATUS_LABEL[a.status]?.cls ?? 'pill-orange'}>
                  {STATUS_LABEL[a.status]?.text ?? a.status}
                </span>
              </div>
              <p className="text-sm font-medium">{getName(a)}</p>
              <p className="text-xs text-muted">{a.session_type} · {a.duration_min} dk</p>
              {a.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => updateStatus(a.id, 'confirmed')}
                    className="btn-primary py-1 px-2 text-xs">Onayla</button>
                  <button onClick={() => updateStatus(a.id, 'cancelled')}
                    className="btn-outline py-1 px-2 text-xs">İptal</button>
                </div>
              )}
              {a.status === 'confirmed' && (
                <button onClick={() => updateStatus(a.id, 'completed')}
                  className="btn-outline py-1 px-2 text-xs mt-2">Tamamlandı ✓</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="p-3 md:p-6">
      {/* Mobil tab seçici */}
      <div className="flex md:hidden gap-2 mb-4">
        {(['calendar', 'today'] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${mobileTab === tab ? 'bg-sage text-white' : 'bg-white border border-border text-charcoal'}`}>
            {tab === 'calendar' ? '📅 Takvim' : '⏰ Bugün'}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Takvim grid */}
        <div className={`flex-1 ${mobileTab === 'today' ? 'hidden md:block' : ''}`}>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 bg-sage">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-2 text-center text-[10px] md:text-xs font-bold text-white uppercase tracking-wide">{d}</div>
              ))}
            </div>
            {/* Yatay kaydırma — çok küçük ekranlar için */}
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 min-w-[320px]">
                {cells.map((cell, i) => {
                  if (!cell.day) return (
                    <div key={`empty-${i}`} className="min-h-[56px] md:min-h-[80px] border-r border-b border-border/40 bg-gray-50/30" />
                  )
                  const isToday = cell.dateKey === today
                  const dayAppts = byDay[cell.dateKey] ?? []
                  return (
                    <div key={cell.dateKey}
                      className={`min-h-[56px] md:min-h-[80px] p-1 border-r border-b border-border/40 transition-colors hover:bg-sage-pale/30
                        ${isToday ? 'bg-sage-pale/50' : ''}`}>
                      <div className={`w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-xs font-semibold mb-0.5
                        ${isToday ? 'bg-sage text-white rounded-full' : 'text-charcoal'}`}>
                        {cell.day}
                      </div>
                      {dayAppts.slice(0, 2).map(a => (
                        <div key={a.id}
                          className={`text-[9px] md:text-[10px] px-1 py-0.5 rounded mb-0.5 truncate text-white font-medium
                            ${a.status === 'cancelled' ? 'bg-gray-400' : 'bg-sage'}`}>
                          {format(new Date(a.starts_at), 'HH:mm')} {getName(a).split(' ')[0]}
                        </div>
                      ))}
                      {dayAppts.length > 2 && (
                        <div className="text-[9px] text-muted">+{dayAppts.length - 2}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sağ panel */}
        <div className={`w-full md:w-72 flex-shrink-0 space-y-4 ${mobileTab === 'calendar' ? 'hidden md:block' : ''}`}>
          <button onClick={() => setAddOpen(true)} className="btn-primary w-full justify-center">
            + Randevu Ekle
          </button>
          <TodayPanel />
        </div>

        {/* Masaüstünde bugün her zaman görünür — ayrıca mobil tab'dan da erişilir */}
        <div className="hidden md:block">
          {/* boş — yukarıdaki flex zaten gösteriyor */}
        </div>
      </div>

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Yeni Randevu</h3>
              <button onClick={() => setAddOpen(false)} className="text-muted text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="label">Danışan Adı *</label>
                <input className="input" placeholder="Ad Soyad" required
                  value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Seans Türü</label>
                <select className="input" value={form.session_type}
                  onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}>
                  <option>Bireysel Terapi</option>
                  <option>İlk Görüşme</option>
                  <option>Çift Terapisi</option>
                  <option>Online Seans</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tarih & Saat *</label>
                  <input className="input" type="datetime-local" required
                    value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Süre (dk)</label>
                  <select className="input" value={form.duration_min}
                    onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}>
                    <option value="30">30 dk</option>
                    <option value="50">50 dk</option>
                    <option value="60">60 dk</option>
                    <option value="90">90 dk</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Not</label>
                <textarea className="input resize-none" rows={2}
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddOpen(false)} className="btn-outline flex-1 justify-center">İptal</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60">
                  {loading ? 'Ekleniyor…' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
