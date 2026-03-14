'use client'
// components/panel/ClientsClient.tsx

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Client } from '@/lib/types'

interface Props {
  clients: Client[]
  profileSlug: string
}

const STATUS: Record<string, { text: string; cls: string }> = {
  active:  { text: 'Aktif',  cls: 'pill-green'  },
  passive: { text: 'Pasif',  cls: 'pill-orange' },
  new:     { text: 'Yeni',   cls: 'pill-blue'   },
}

export default function ClientsClient({ clients: initial, profileSlug }: Props) {
  const [clients, setClients] = useState(initial)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const newClient = await res.json()
      setClients(c => [newClient, ...c])
      setAddOpen(false)
      setForm({ full_name: '', phone: '', email: '', session_type: 'Bireysel Terapi', notes: '' })
      toast.success('Danışan eklendi!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <input
          className="input w-64"
          placeholder="İsim, telefon veya e-posta ile ara…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{filtered.length} danışan</span>
          <button onClick={() => setAddOpen(true)} className="btn-primary">+ Yeni Danışan</button>
        </div>
      </div>

      {/* Booking link banner */}
      <div className="mb-5 bg-sage-pale border border-sage-l rounded-xl px-5 py-3.5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-sage">Randevu Linkiniz</p>
          <p className="text-sm font-mono mt-0.5">psikopanel.tr/{profileSlug}/booking</p>
          <p className="text-xs text-muted mt-0.5">Bu linki danışanlarınızla paylaşın — üye olmadan randevu alabilirler.</p>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${profileSlug}/booking`); toast.success('Kopyalandı!') }}
          className="btn-outline btn-sm flex-shrink-0">
          📋 Kopyala
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-cream">
                <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">Ad Soyad</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">Telefon</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">E-posta</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">Seans</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">Durum</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted">
                    {search ? 'Sonuç bulunamadı' : 'Henüz danışan yok'}
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-cream/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-sm">{c.full_name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted">{c.phone ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-muted">{c.email ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm">{c.session_type ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={STATUS[c.status]?.cls ?? 'pill-sage'}>
                      {STATUS[c.status]?.text ?? c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted">
                    {new Date(c.created_at).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
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
                  <option>Bireysel Terapi</option>
                  <option>İlk Görüşme</option>
                  <option>Çift Terapisi</option>
                  <option>Online Seans</option>
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
