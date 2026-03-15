'use client'
// components/panel/CalendarClient.tsx

import { useState } from 'react'
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
}

interface Props {
  appointments: Appt[]
  todayAppts: Appt[]
  pendingAppts: Appt[]
  viewDate: { year: number; month: number }
  today: string
}

const STATUS_CFG: Record<string, { text: string; cls: string; dot: string }> = {
  pending:   { text: 'Bekliyor',    cls: 'pill-orange', dot: 'bg-orange-400' },
  confirmed: { text: 'Onaylı',      cls: 'pill-green',  dot: 'bg-green-500'  },
  completed: { text: 'Tamamlandı',  cls: 'pill-sage',   dot: 'bg-sage'       },
  cancelled: { text: 'İptal',       cls: 'pill-orange', dot: 'bg-gray-400'   },
}

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function CalendarClient({ appointments, todayAppts, pendingAppts, viewDate, today }: Props) {
  const [addOpen, setAddOpen]     = useState(false)
  const [detailAppt, setDetailAppt] = useState<Appt | null>(null)
  const [form, setForm]           = useState({ guest_name: '', session_type: 'Bireysel Terapi', starts_at: '', duration_min: '50', notes: '' })
  const [loading, setLoading]     = useState(false)
  const [localToday, setLocalToday]     = useState(todayAppts)
  const [localPending, setLocalPending] = useState(pendingAppts)
  const [localAll, setLocalAll]         = useState(appointments)
  const [mobileTab, setMobileTab] = useState<'calendar' | 'today' | 'pending'>('calendar')

  const { year, month } = viewDate
  const firstDay    = new Date(year, month - 1, 1)
  const offset      = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  // Sadece confirmed+completed randevuları takvimde göster
  const byDay: Record<string, Appt[]> = {}
  for (const a of localAll) {
    if (a.status === 'cancelled') continue
    const key = a.starts_at.slice(0, 10)
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(a)
  }

  function getName(a: Appt) { return a.client?.full_name ?? a.guest_name ?? '—' }

  // ── Randevu durumunu güncelle ────────────────────────────────────────────
  async function updateStatus(id: string, status: string) {
    const res = await fetch('/api/appointments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) { toast.error('Güncelleme başarısız'); return }
    const updated: Appt = await res.json()

    // Tüm listeleri güncelle
    const updateList = (list: Appt[]) => list.map(a => a.id === id ? { ...a, status } : a)
    setLocalAll(updateList)
    setLocalToday(prev => {
      const updated2 = updateList(prev)
      // Confirmed oldu → today listesine ekle (eğer bugünse)
      if (status === 'confirmed') {
        const appt = localPending.find(a => a.id === id)
        if (appt && appt.starts_at.slice(0, 10) === today && !prev.find(a => a.id === id)) {
          return [...prev, { ...appt, status }].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        }
      }
      return updated2
    })
    setLocalPending(prev => {
      if (status === 'confirmed' || status === 'cancelled') return prev.filter(a => a.id !== id)
      return updateList(prev)
    })

    if (detailAppt?.id === id) setDetailAppt(d => d ? { ...d, status } : d)

    const labels: Record<string, string> = { confirmed: 'Randevu onaylandı ✓', cancelled: 'Randevu iptal edildi', completed: 'Tamamlandı ✓' }
    toast.success(labels[status] ?? 'Güncellendi')
  }

  // ── Panelden randevu ekle ────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.guest_name || !form.starts_at) { toast.error('İsim ve saat zorunlu'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: form.guest_name, guest_phone: null,
          session_type: form.session_type,
          starts_at: new Date(form.starts_at).toISOString(),
          duration_min: parseInt(form.duration_min),
          notes: form.notes || null,
          _panel_add: true,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const newAppt: Appt = await res.json()
      setLocalAll(a => [newAppt, ...a])
      if (newAppt.starts_at.slice(0, 10) === today) setLocalToday(a => [...a, newAppt].sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
      setAddOpen(false)
      setForm({ guest_name: '', session_type: 'Bireysel Terapi', starts_at: '', duration_min: '50', notes: '' })
      toast.success('Randevu eklendi!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally { setLoading(false) }
  }

  const cells: { day: number | null; dateKey: string }[] = []
  for (let i = 0; i < offset; i++) cells.push({ day: null, dateKey: '' })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateKey })
  }

  // ── Bugün paneli ────────────────────────────────────────────────────────
  const TodayPanel = () => (
    <div className="card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><Calendar size={14} className="text-sage" /> Bugün</h3>
          <p className="text-xs text-muted">{format(new Date(today + 'T12:00:00'), 'd MMMM', { locale: tr })}</p>
        </div>
        <span className="text-xs bg-sage text-white rounded-full px-2 py-0.5 font-semibold">{localToday.filter(a => a.status !== 'cancelled').length}</span>
      </div>
      {localToday.filter(a => a.status !== 'cancelled').length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted text-center">Bugün randevu yok</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {localToday.filter(a => a.status !== 'cancelled').map(a => (
            <li key={a.id} className="px-4 py-3 hover:bg-cream/40 transition-colors cursor-pointer" onClick={() => setDetailAppt(a)}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-sage">{format(new Date(a.starts_at), 'HH:mm')}</span>
                <span className={STATUS_CFG[a.status]?.cls ?? 'pill-orange'}>{STATUS_CFG[a.status]?.text ?? a.status}</span>
              </div>
              <p className="text-sm font-medium">{getName(a)}</p>
              <p className="text-xs text-muted">{a.session_type} · {a.duration_min} dk</p>
              {a.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={e => { e.stopPropagation(); updateStatus(a.id, 'confirmed') }}
                    className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1"><Check size={11} /> Onayla</button>
                  <button onClick={e => { e.stopPropagation(); updateStatus(a.id, 'cancelled') }}
                    className="btn-outline py-1 px-2.5 text-xs text-red-500 hover:border-red-300 flex items-center gap-1"><X size={11} /> İptal</button>
                </div>
              )}
              {a.status === 'confirmed' && (
                <button onClick={e => { e.stopPropagation(); updateStatus(a.id, 'completed') }}
                  className="btn-outline py-1 px-2.5 text-xs mt-2 flex items-center gap-1"><CheckCircle2 size={11} /> Tamamlandı</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  // ── Bekleyen onaylar paneli ────────────────────────────────────────────
  const PendingPanel = () => (
    <div className="card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Clock size={14} className="text-orange-500" /> Onay Bekleyen
        </h3>
        {localPending.length > 0 && (
          <span className="text-xs bg-orange-400 text-white rounded-full px-2 py-0.5 font-semibold animate-pulse">{localPending.length}</span>
        )}
      </div>
      {localPending.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted text-center">Bekleyen randevu yok</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {localPending.map(a => (
            <li key={a.id} className="px-4 py-3.5 hover:bg-cream/40 transition-colors cursor-pointer" onClick={() => setDetailAppt(a)}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{getName(a)}</p>
                  <p className="text-xs text-muted">{a.session_type}</p>
                </div>
                <ChevronRight size={14} className="text-muted flex-shrink-0 mt-0.5" />
              </div>
              <p className="text-xs text-sage font-medium mb-2">
                {format(new Date(a.starts_at), 'd MMM · HH:mm', { locale: tr })}
              </p>
              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); updateStatus(a.id, 'confirmed') }}
                  className="btn-primary py-1 px-2.5 text-xs flex-1 justify-center flex items-center gap-1">
                  <Check size={11} /> Onayla
                </button>
                <button onClick={e => { e.stopPropagation(); updateStatus(a.id, 'cancelled') }}
                  className="btn-outline py-1 px-2.5 text-xs text-red-500 hover:border-red-300 flex-1 justify-center flex items-center gap-1">
                  <X size={11} /> İptal
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="p-3 md:p-6">
      {/* Mobil tab */}
      <div className="flex md:hidden gap-1 mb-4 bg-cream rounded-xl p-1">
        {([
          { key: 'calendar', label: '📅 Takvim' },
          { key: 'today',   label: `⏰ Bugün${localToday.filter(a=>a.status!=='cancelled').length > 0 ? ` (${localToday.filter(a=>a.status!=='cancelled').length})` : ''}` },
          { key: 'pending', label: `🔔 Bekleyen${localPending.length > 0 ? ` (${localPending.length})` : ''}` },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setMobileTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors
              ${mobileTab === tab.key ? 'bg-white shadow-sm text-charcoal' : 'text-muted'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Takvim grid */}
        <div className={`flex-1 ${mobileTab !== 'calendar' ? 'hidden md:block' : ''}`}>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 bg-sage">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-2 text-center text-[10px] md:text-xs font-bold text-white uppercase tracking-wide">{d}</div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 min-w-[320px]">
                {cells.map((cell, i) => {
                  if (!cell.day) return (
                    <div key={`e-${i}`} className="min-h-[56px] md:min-h-[80px] border-r border-b border-border/40 bg-gray-50/30" />
                  )
                  const isToday  = cell.dateKey === today
                  const dayAppts = byDay[cell.dateKey] ?? []
                  const hasPending = localPending.some(a => a.starts_at.slice(0, 10) === cell.dateKey)
                  return (
                    <div key={cell.dateKey}
                      className={`min-h-[56px] md:min-h-[80px] p-1 border-r border-b border-border/40 hover:bg-sage-pale/30 transition-colors relative
                        ${isToday ? 'bg-sage-pale/50' : ''}`}>
                      <div className={`w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-xs font-semibold mb-0.5
                        ${isToday ? 'bg-sage text-white rounded-full' : 'text-charcoal'}`}>
                        {cell.day}
                      </div>
                      {hasPending && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-400" title="Onay bekleyen randevu var" />
                      )}
                      {dayAppts.slice(0, 2).map(a => (
                        <div key={a.id} onClick={() => setDetailAppt(a)}
                          className={`text-[9px] md:text-[10px] px-1 py-0.5 rounded mb-0.5 truncate text-white font-medium cursor-pointer hover:opacity-80
                            ${a.status === 'completed' ? 'bg-charcoal/60' : 'bg-sage'}`}>
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
        <div className={`w-full md:w-72 flex-shrink-0 space-y-4 ${mobileTab === 'calendar' ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          <button onClick={() => setAddOpen(true)} className="btn-primary w-full justify-center flex items-center gap-1.5">
            <Plus size={15} /> Randevu Ekle
          </button>
          {(mobileTab === 'pending' || mobileTab === 'calendar') && (
            <div className={mobileTab === 'pending' ? '' : ''}>
              <PendingPanel />
            </div>
          )}
          {(mobileTab === 'today' || mobileTab === 'calendar') && <TodayPanel />}
        </div>
      </div>

      {/* Randevu detay modal */}
      {detailAppt && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{getName(detailAppt)}</h3>
                <p className="text-xs text-muted mt-0.5">
                  {format(new Date(detailAppt.starts_at), 'd MMMM yyyy · HH:mm', { locale: tr })}
                  {' · '}{detailAppt.duration_min} dk
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={STATUS_CFG[detailAppt.status]?.cls ?? 'pill-orange'}>
                  {STATUS_CFG[detailAppt.status]?.text ?? detailAppt.status}
                </span>
                <button onClick={() => setDetailAppt(null)} className="text-muted text-2xl leading-none hover:text-charcoal">×</button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Seans', value: detailAppt.session_type },
                { label: 'Telefon', value: detailAppt.guest_phone },
                { label: 'E-posta', value: detailAppt.guest_email },
                { label: 'Danışan Notu', value: detailAppt.guest_note },
                { label: 'Psikolog Notu', value: detailAppt.notes },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-0.5">{f.label}</p>
                  <p className="text-sm text-charcoal">{f.value}</p>
                </div>
              ))}
              {detailAppt.status === 'pending' && (
                <div className="flex gap-3 pt-3 border-t border-border">
                  <button onClick={() => updateStatus(detailAppt.id, 'confirmed')}
                    className="btn-primary flex-1 justify-center flex items-center gap-1.5"><Check size={14} /> Onayla</button>
                  <button onClick={() => { updateStatus(detailAppt.id, 'cancelled'); setDetailAppt(null) }}
                    className="btn-outline flex-1 justify-center text-red-500 hover:border-red-300 flex items-center gap-1.5"><X size={14} /> İptal</button>
                </div>
              )}
              {detailAppt.status === 'confirmed' && (
                <button onClick={() => { updateStatus(detailAppt.id, 'completed'); setDetailAppt(null) }}
                  className="btn-outline w-full justify-center flex items-center gap-1.5 mt-2"><CheckCircle2 size={14} /> Tamamlandı İşaretle</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Randevu ekle modal */}
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
                  <option>Bireysel Terapi</option><option>İlk Görüşme</option>
                  <option>Çift Terapisi</option><option>Online Seans</option>
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
                    <option value="30">30 dk</option><option value="50">50 dk</option>
                    <option value="60">60 dk</option><option value="90">90 dk</option>
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
