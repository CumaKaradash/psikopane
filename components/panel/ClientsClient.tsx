'use client'
// components/panel/ClientsClient.tsx

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Client } from '@/lib/types'
import { Mail, MessageCircle, Search, UserPlus, Phone } from 'lucide-react'

interface Props {
  clients: Client[]
  profileSlug: string
}

const STATUS: Record<string, { text: string; cls: string }> = {
  active:  { text: 'Aktif',  cls: 'pill-green'  },
  passive: { text: 'Pasif',  cls: 'pill-orange' },
  new:     { text: 'Yeni',   cls: 'pill-blue'   },
}

function whatsappUrl(phone: string) {
  const cleaned = phone.replace(/\D/g, '')
  const intl = cleaned.startsWith('0') ? '90' + cleaned.slice(1) : cleaned
  return `https://wa.me/${intl}`
}

export default function ClientsClient({ clients: initial, profileSlug }: Props) {
  const [clients, setClients] = useState(initial)
  const [search,  setSearch]  = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Client | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', session_type: 'Bireysel Terapi', notes: '' })

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name) { toast.error('Ad zorunlu'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const newClient: Client = await res.json()
      setClients(c => [newClient, ...c])
      setAddOpen(false)
      setForm({ full_name: '', phone: '', email: '', session_type: 'Bireysel Terapi', notes: '' })
      toast.success('Danışan eklendi!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally { setLoading(false) }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch('/api/clients', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      setClients(cs => cs.map(c => c.id === id ? { ...c, status: status as Client['status'] } : c))
      if (selected?.id === id) setSelected(s => s ? { ...s, status: status as Client['status'] } : s)
      toast.success('Güncellendi')
    } else toast.error('Güncelleme başarısız')
  }

  return (
    <div className="p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input className="input pl-9 w-64" placeholder="İsim, telefon veya e-posta…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{filtered.length} danışan</span>
          <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-1.5">
            <UserPlus size={14} /> Yeni Danışan
          </button>
        </div>
      </div>

      {/* Booking link banner */}
      <div className="mb-5 bg-sage-pale border border-sage-l rounded-xl px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sage">Randevu Linkiniz</p>
          <p className="text-sm font-mono mt-0.5 truncate">psikopanel.tr/{profileSlug}/booking</p>
          <p className="text-xs text-muted mt-0.5">Bu linki danışanlarınızla paylaşın — üye olmadan randevu alabilirler.</p>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${profileSlug}/booking`); toast.success('Kopyalandı!') }}
          className="btn-outline btn-sm flex-shrink-0">📋 Kopyala</button>
      </div>

      {/* Kart listesi */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-muted">{search ? 'Sonuç bulunamadı' : 'Henüz danışan yok'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="card p-4 hover:shadow-md transition-shadow duration-200">
              {/* Başlık */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{c.full_name}</p>
                  {c.session_type && <p className="text-xs text-muted">{c.session_type}</p>}
                </div>
                <span className={`${STATUS[c.status]?.cls ?? 'pill-sage'} flex-shrink-0`}>{STATUS[c.status]?.text ?? c.status}</span>
              </div>

              {/* İletişim bilgileri */}
              {c.phone && (
                <div className="flex items-center gap-2 text-xs text-muted mb-1.5">
                  <Phone size={11} className="flex-shrink-0" />
                  <span className="truncate">{c.phone}</span>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2 text-xs text-muted mb-1.5">
                  <Mail size={11} className="flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}

              {/* İletişim butonları */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                {c.email && (
                  <a href={`mailto:${c.email}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-border text-xs font-medium text-muted hover:text-charcoal hover:border-charcoal transition-colors"
                    title={`E-posta gönder: ${c.email}`}>
                    <Mail size={12} /> E-posta
                  </a>
                )}
                {c.phone && (
                  <a href={whatsappUrl(c.phone)} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-border text-xs font-medium text-muted hover:text-green-600 hover:border-green-400 transition-colors"
                    title={`WhatsApp: ${c.phone}`}>
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                )}
                <button onClick={() => setSelected(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-border text-xs font-medium text-muted hover:text-charcoal hover:border-charcoal transition-colors">
                  Detay
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Danışan detay modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selected.full_name}</h3>
                <p className="text-xs text-muted mt-0.5">{selected.session_type ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={STATUS[selected.status]?.cls ?? 'pill-sage'}>{STATUS[selected.status]?.text ?? selected.status}</span>
                <button onClick={() => setSelected(null)} className="text-muted text-2xl leading-none hover:text-charcoal">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {selected.phone && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted font-semibold uppercase tracking-wide">Telefon</p>
                    <p className="text-sm mt-0.5">{selected.phone}</p>
                  </div>
                  <a href={whatsappUrl(selected.phone)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-green-300 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors">
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                </div>
              )}
              {selected.email && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted font-semibold uppercase tracking-wide">E-posta</p>
                    <p className="text-sm mt-0.5">{selected.email}</p>
                  </div>
                  <a href={`mailto:${selected.email}`}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-border text-xs font-medium hover:bg-cream transition-colors">
                    <Mail size={13} /> E-posta Gönder
                  </a>
                </div>
              )}
              {selected.notes && (
                <div>
                  <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Notlar</p>
                  <p className="text-sm bg-cream rounded-lg px-3 py-2.5 leading-relaxed">{selected.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">Durum Değiştir</p>
                <div className="flex gap-2">
                  {(['active', 'passive', 'new'] as const).map(s => (
                    <button key={s} onClick={() => updateStatus(selected.id, s)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors
                        ${selected.status === s
                          ? s === 'active' ? 'bg-green-50 border-green-400 text-green-700'
                          : s === 'new' ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'bg-orange-50 border-orange-400 text-orange-700'
                          : 'border-border text-muted hover:border-charcoal'}`}>
                      {STATUS[s].text}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted">Kayıt: {new Date(selected.created_at).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Yeni danışan modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Yeni Danışan</h3>
              <button onClick={() => setAddOpen(false)} className="text-muted text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">Ad Soyad *</label>
                <input className="input" required placeholder="Ayşe Yılmaz"
                  value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefon</label>
                  <input className="input" placeholder="05XX XXX XX XX"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">E-posta</label>
                  <input className="input" type="email" placeholder="email@ornek.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Seans Türü</label>
                <select className="input" value={form.session_type}
                  onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}>
                  <option>Bireysel Terapi</option><option>İlk Görüşme</option>
                  <option>Çift Terapisi</option><option>Online Seans</option>
                </select>
              </div>
              <div>
                <label className="label">Notlar</label>
                <textarea className="input resize-none" rows={2} placeholder="Başvuru sebebi, yönlendiren…"
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
