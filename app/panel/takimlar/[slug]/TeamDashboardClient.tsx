'use client'
// app/panel/takimlar/[slug]/TeamDashboardClient.tsx

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  Calendar, Users, FileText, DollarSign,
  Archive, Home, Settings,
  Clock, UserPlus, TrendingUp,
  BarChart2, List, Plus,
  FlaskConical, BookOpen, Search,
  ExternalLink, FileImage,
  Trash2, Check, X, Pencil,
  Mail, Save, ChevronRight,
} from 'lucide-react'
import TeamCalendar from '@/components/panel/TeamCalendar'
import TeamClients from '@/components/panel/TeamClients'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface TeamMember {
  id: string; psychologist_id: string; role: string; status: string; joined_at: string
  profile?: { id: string; full_name: string; title: string; slug: string; avatar_url?: string }
}
interface Team {
  id: string; name: string; slug: string; description?: string; owner_id: string; created_at: string
  bio?: string; session_types: string[]; avatar_url?: string; members?: TeamMember[]
  owner?: { id: string; full_name: string; title: string; slug: string; avatar_url?: string }
}
interface Props { team: Team; currentUserId: string; isOwner: boolean; userRole: string }
type Tab = 'overview' | 'calendar' | 'clients' | 'finance' | 'tests' | 'homework' | 'archive'

// ── Ortak Muhasebe ─────────────────────────────────────────────────────────────
interface FinanceEntry {
  id: string; psychologist_id: string; type: 'income' | 'expense'
  amount: number; description: string; entry_date: string; created_at: string
}

function TeamFinance({ teamId, members }: { teamId: string; members: TeamMember[] }) {
  const [entries, setEntries]   = useState<FinanceEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [addOpen, setAddOpen]   = useState(false)
  const [view, setView]         = useState<'list' | 'chart'>('list')
  const [filterMember, setFilterMember] = useState('all')
  const [editId, setEditId]     = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ type: 'income', amount: '', description: '', entry_date: '' })
  const [editForm, setEditForm] = useState({ type: 'income', amount: '', description: '', entry_date: '' })

  const memberMap: Record<string, string> = {}
  members.filter(m => m.status === 'accepted').forEach(m => {
    if (m.profile) memberMap[m.psychologist_id] = m.profile.full_name
  })

  useEffect(() => { fetchEntries() }, [teamId, filterMember])

  async function fetchEntries() {
    try {
      setLoading(true)
      const url = filterMember === 'all'
        ? `/api/finance?team_id=${teamId}`
        : `/api/finance?team_id=${teamId}&member_id=${filterMember}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setEntries(data || [])
      else toast.error(data.error || 'Kayıtlar yüklenemedi')
    } catch { toast.error('Yükleme hatası') }
    finally { setLoading(false) }
  }

  const income  = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net     = income - expense

  const chartData = Object.values(
    entries.reduce((acc: Record<string, { date: string; gelir: number; gider: number }>, e) => {
      const d = e.entry_date.slice(0, 7)
      if (!acc[d]) acc[d] = { date: d, gelir: 0, gider: 0 }
      if (e.type === 'income') acc[d].gelir += e.amount
      else acc[d].gider += e.amount
      return acc
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date))

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault()
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0 || !form.description) { toast.error('Geçerli veri girin'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: amt, entry_date: form.entry_date || new Date().toISOString().slice(0, 10), team_id: teamId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Kayıt eklendi')
      setAddOpen(false)
      setForm({ type: 'income', amount: '', description: '', entry_date: '' })
      fetchEntries()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally { setSaving(false) }
  }

  async function handleEdit(id: string) {
    const amt = parseFloat(editForm.amount)
    if (isNaN(amt) || amt <= 0 || !editForm.description) { toast.error('Geçerli veri girin'); return }
    try {
      const res = await fetch('/api/finance', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm, amount: amt }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Güncellendi'); setEditId(null); fetchEntries()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Hata') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    const res = await fetch(`/api/finance?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Silindi'); fetchEntries() }
    else toast.error('Silme başarısız')
  }

  const acceptedMembers = members.filter(m => m.status === 'accepted')

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" /></div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Toplam Gelir', value: income,  color: 'text-green-600' },
          { label: 'Toplam Gider', value: expense, color: 'text-red-500'   },
          { label: 'Net Bakiye',   value: net,     color: net >= 0 ? 'text-charcoal' : 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs font-bold text-muted uppercase tracking-wide">{s.label}</p>
            <p className={`font-serif text-3xl mt-1.5 ${s.color}`}>
              {s.value < 0 ? '-' : ''}₺{Math.abs(s.value).toLocaleString('tr-TR')}
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">İşlemler</h3>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="input text-xs py-1 h-8">
              <option value="all">Tüm Üyeler</option>
              {acceptedMembers.map(m => (
                <option key={m.psychologist_id} value={m.psychologist_id}>{m.profile?.full_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView(v => v === 'list' ? 'chart' : 'list')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted hover:text-charcoal transition-colors">
              {view === 'list' ? <><BarChart2 size={13} /> Grafik</> : <><List size={13} /> Liste</>}
            </button>
            <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-1.5">
              <Plus size={14} /> İşlem Ekle
            </button>
          </div>
        </div>

        {view === 'chart' && (
          <div className="px-6 py-6">
            {chartData.length === 0
              ? <p className="text-sm text-muted text-center py-8">Kayıt yok</p>
              : <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₺${v.toLocaleString('tr-TR')}`} />
                    <Tooltip formatter={(v: number, n: string) => [`₺${(v as number).toLocaleString('tr-TR')}`, n === 'gelir' ? 'Gelir' : 'Gider']} />
                    <Legend formatter={(v: string) => v === 'gelir' ? 'Gelir' : 'Gider'} />
                    <Bar dataKey="gelir" fill="#5a7a6a" radius={[4,4,0,0]} />
                    <Bar dataKey="gider" fill="#e57373" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        )}

        {view === 'list' && (
          entries.length === 0
            ? <p className="px-6 py-12 text-center text-sm text-muted">Henüz işlem yok</p>
            : <ul>
                {entries.map(e => (
                  <li key={e.id} className="border-b border-border/60 last:border-0 hover:bg-cream/40 transition-colors group">
                    {editId === e.id ? (
                      <div className="px-6 py-3 space-y-2">
                        <div className="flex gap-2">
                          {(['income', 'expense'] as const).map(t => (
                            <button key={t} type="button" onClick={() => setEditForm(f => ({ ...f, type: t }))}
                              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all
                                ${editForm.type === t ? (t === 'income' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700') : 'border-border text-muted'}`}>
                              {t === 'income' ? '+ Gelir' : '− Gider'}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input className="input flex-1 text-sm" placeholder="Açıklama *" value={editForm.description} onChange={ev => setEditForm(f => ({ ...f, description: ev.target.value }))} />
                          <input className="input w-28 text-sm" type="number" placeholder="Tutar ₺" value={editForm.amount} onChange={ev => setEditForm(f => ({ ...f, amount: ev.target.value }))} />
                          <input className="input w-36 text-sm" type="date" value={editForm.entry_date} onChange={ev => setEditForm(f => ({ ...f, entry_date: ev.target.value }))} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(e.id)} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"><Check size={12} /> Kaydet</button>
                          <button onClick={() => setEditId(null)} className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1"><X size={12} /> İptal</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-6 py-3.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.type === 'income' ? 'bg-green-500' : 'bg-red-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.description}</p>
                          <p className="text-xs text-muted">
                            {new Date(e.entry_date + 'T00:00:00').toLocaleDateString('tr-TR')}
                            {memberMap[e.psychologist_id] && <span className="ml-2 text-sage">· {memberMap[e.psychologist_id]}</span>}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${e.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {e.type === 'income' ? '+' : '−'}₺{e.amount.toLocaleString('tr-TR')}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => { setEditId(e.id); setEditForm({ type: e.type, amount: String(e.amount), description: e.description, entry_date: e.entry_date }) }}
                            className="p-1.5 rounded hover:bg-cream text-muted hover:text-charcoal transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
        )}
      </div>

      {addOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">İşlem Ekle</h3>
              <button onClick={() => setAddOpen(false)} className="text-muted text-xl leading-none hover:text-charcoal">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">Tür</label>
                <div className="flex gap-3">
                  {(['income', 'expense'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all
                        ${form.type === t ? (t === 'income' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700') : 'border-border text-muted hover:border-charcoal'}`}>
                      {t === 'income' ? '+ Gelir' : '− Gider'}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="label">Tutar (₺) *</label><input className="input" type="number" min="1" step="0.01" required placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><label className="label">Açıklama *</label><input className="input" required placeholder="ör. Seans ücreti — Zeynep Arslan" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label className="label">Tarih</label><input className="input" type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddOpen(false)} className="btn-outline flex-1 justify-center">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Takım Testleri ─────────────────────────────────────────────────────────────
interface TeamTest {
  id: string; title: string; slug: string; description: string | null
  is_active: boolean; is_public: boolean; created_at: string; psychologist_id: string
}

function TeamTests({ teamId, members }: { teamId: string; members: TeamMember[] }) {
  const [tests, setTests]     = useState<TeamTest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMember, setFilterMember] = useState('all')
  const [search, setSearch]   = useState('')

  const memberMap: Record<string, string> = {}
  members.filter(m => m.status === 'accepted').forEach(m => {
    if (m.profile) memberMap[m.psychologist_id] = m.profile.full_name
  })

  useEffect(() => { fetchTests() }, [teamId, filterMember])

  async function fetchTests() {
    try {
      setLoading(true)
      const url = filterMember === 'all'
        ? `/api/tests?team_id=${teamId}`
        : `/api/tests?team_id=${teamId}&member_id=${filterMember}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setTests(data || [])
      else toast.error(data.error || 'Testler yüklenemedi')
    } catch { toast.error('Yükleme hatası') }
    finally { setLoading(false) }
  }

  const filtered = tests.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
  const acceptedMembers = members.filter(m => m.status === 'accepted')

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" /></div>

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Takım Testleri</h3>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="text" placeholder="Test ara..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
            </div>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="input">
              <option value="all">Tüm Üyeler</option>
              {acceptedMembers.map(m => <option key={m.psychologist_id} value={m.psychologist_id}>{m.profile?.full_name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="px-5 py-3.5 border-b border-border"><h3 className="text-sm font-semibold">Testler ({filtered.length})</h3></div>
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FlaskConical className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">{search ? 'Arama kriterine uygun test bulunamadı.' : 'Henüz takımda paylaşılmış test yok.'}</p>
            <p className="text-xs text-muted mt-1">Bireysel panelinizdeki testlerde "Takıma Aç" butonunu kullanın.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map(test => (
              <div key={test.id} className="px-5 py-4 hover:bg-cream/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{test.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${test.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {test.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    {test.description && <p className="text-xs text-muted truncate">{test.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                      <span className="text-sage font-medium">{memberMap[test.psychologist_id] || 'Bilinmiyor'}</span>
                      <span>{format(new Date(test.created_at), 'd MMM yyyy', { locale: tr })}</span>
                    </div>
                  </div>
                  <a href="/panel/tests" className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1 flex-shrink-0">
                    <ExternalLink size={12} /> Görüntüle
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Takım Ödevleri ─────────────────────────────────────────────────────────────
interface TeamHomeworkItem {
  id: string; title: string; slug: string; description: string | null
  is_active: boolean; due_date: string | null; created_at: string; psychologist_id: string
}

function TeamHomework({ teamId, members }: { teamId: string; members: TeamMember[] }) {
  const [homework, setHomework] = useState<TeamHomeworkItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filterMember, setFilterMember] = useState('all')
  const [search, setSearch]     = useState('')

  const memberMap: Record<string, string> = {}
  members.filter(m => m.status === 'accepted').forEach(m => {
    if (m.profile) memberMap[m.psychologist_id] = m.profile.full_name
  })

  useEffect(() => { fetchHomework() }, [teamId, filterMember])

  async function fetchHomework() {
    try {
      setLoading(true)
      const url = filterMember === 'all'
        ? `/api/homework?team_id=${teamId}`
        : `/api/homework?team_id=${teamId}&member_id=${filterMember}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setHomework(data || [])
      else toast.error(data.error || 'Ödevler yüklenemedi')
    } catch { toast.error('Yükleme hatası') }
    finally { setLoading(false) }
  }

  const filtered = homework.filter(h => !search || h.title.toLowerCase().includes(search.toLowerCase()))
  const acceptedMembers = members.filter(m => m.status === 'accepted')

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" /></div>

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Takım Ödevleri</h3>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="text" placeholder="Ödev ara..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
            </div>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="input">
              <option value="all">Tüm Üyeler</option>
              {acceptedMembers.map(m => <option key={m.psychologist_id} value={m.psychologist_id}>{m.profile?.full_name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="px-5 py-3.5 border-b border-border"><h3 className="text-sm font-semibold">Ödevler ({filtered.length})</h3></div>
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">{search ? 'Arama kriterine uygun ödev bulunamadı.' : 'Henüz takımda paylaşılmış ödev yok.'}</p>
            <p className="text-xs text-muted mt-1">Bireysel panelinizdeki ödevlerde "Takıma Aç" butonunu kullanın.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map(hw => (
              <div key={hw.id} className="px-5 py-4 hover:bg-cream/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{hw.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${hw.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {hw.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    {hw.description && <p className="text-xs text-muted truncate">{hw.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                      <span className="text-sage font-medium">{memberMap[hw.psychologist_id] || 'Bilinmiyor'}</span>
                      {hw.due_date && <span>Son: {format(new Date(hw.due_date), 'd MMM yyyy', { locale: tr })}</span>}
                      <span>{format(new Date(hw.created_at), 'd MMM yyyy', { locale: tr })}</span>
                    </div>
                  </div>
                  <a href="/panel/homework" className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1 flex-shrink-0">
                    <ExternalLink size={12} /> Görüntüle
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Klinik Arşivi ──────────────────────────────────────────────────────────────
interface ArchiveFile {
  id: string; psychologist_id: string; file_name: string
  storage_path: string; file_type: string; file_size: number
  category: string; notes: string | null; created_at: string
}

function TeamArchive({ teamId, members }: { teamId: string; members: TeamMember[] }) {
  const [files, setFiles]       = useState<ArchiveFile[]>([])
  const [loading, setLoading]   = useState(true)
  const [filterMember, setFilterMember] = useState('all')
  const [search, setSearch]     = useState('')

  const memberMap: Record<string, string> = {}
  members.filter(m => m.status === 'accepted').forEach(m => {
    if (m.profile) memberMap[m.psychologist_id] = m.profile.full_name
  })

  useEffect(() => { fetchFiles() }, [teamId, filterMember])

  async function fetchFiles() {
    try {
      setLoading(true)
      const url = filterMember === 'all'
        ? `/api/files?team_id=${teamId}`
        : `/api/files?team_id=${teamId}&member_id=${filterMember}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setFiles((data || []).filter((f: ArchiveFile) => f.category !== '__url_entry__'))
      else toast.error(data.error || 'Dosyalar yüklenemedi')
    } catch { toast.error('Yükleme hatası') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string, storagePath: string) {
    if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return
    const res = await fetch(`/api/files?id=${id}&path=${encodeURIComponent(storagePath)}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Silindi'); setFiles(fs => fs.filter(f => f.id !== id)) }
    else toast.error('Silme başarısız')
  }

  function fmtSize(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  const filtered = files.filter(f =>
    (!search || f.file_name.toLowerCase().includes(search.toLowerCase()))
  )

  const acceptedMembers = members.filter(m => m.status === 'accepted')

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" /></div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Toplam Dosya', value: files.length, color: 'bg-sage/10', iconColor: 'text-sage', Icon: Archive },
          { label: 'Görsel', value: files.filter(f => f.file_type.startsWith('image/')).length, color: 'bg-blue-50', iconColor: 'text-blue-500', Icon: FileImage },
          { label: 'PDF', value: files.filter(f => f.file_type === 'application/pdf').length, color: 'bg-red-50', iconColor: 'text-red-500', Icon: FileText },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}>
                <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted">{s.label}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Archive className="w-4 h-4" /> Klinik Arşivi</h3>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="text" placeholder="Dosya ara..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
            </div>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="input">
              <option value="all">Tüm Üyeler</option>
              {acceptedMembers.map(m => <option key={m.psychologist_id} value={m.psychologist_id}>{m.profile?.full_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-3.5 border-b border-border"><h3 className="text-sm font-semibold">Dosyalar ({filtered.length})</h3></div>
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Archive className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">{search ? 'Dosya bulunamadı.' : 'Henüz paylaşılmış dosya yok.'}</p>
            <p className="text-xs text-muted mt-1">Bireysel arşivinizdeki dosyaları "Takıma Aç" ile paylaşabilirsiniz.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map(file => (
              <div key={file.id} className="px-5 py-3.5 hover:bg-cream/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center flex-shrink-0">
                    {file.file_type.startsWith('image/') ? <FileImage size={16} className="text-blue-500" />
                      : file.file_type === 'application/pdf' ? <FileText size={16} className="text-red-500" />
                      : <FileText size={16} className="text-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{fmtSize(file.file_size)}</span>
                      <span className="text-sage font-medium">{memberMap[file.psychologist_id] || 'Bilinmiyor'}</span>
                      <span>{format(new Date(file.created_at), 'd MMM yyyy', { locale: tr })}</span>
                      {file.notes && <span className="truncate max-w-[200px]">{file.notes}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <a href={file.storage_path} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-cream text-muted hover:text-charcoal transition-colors"><ExternalLink size={14} /></a>
                    <button onClick={() => handleDelete(file.id, file.storage_path)}
                      className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ayarlar Modalı ─────────────────────────────────────────────────────────
function SettingsModal({ team, onClose, onSaved }: {
  team: Team
  onClose: () => void
  onSaved: (updated: Partial<Team>) => void
}) {
  const [name, setName]     = useState(team.name)
  const [desc, setDesc]     = useState(team.description ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Takım adı zorunludur'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/network', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_team', team_id: team.id, name: name.trim(), description: desc.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hata oluştu')
      toast.success('Takım bilgileri güncellendi!')
      onSaved({ name: name.trim(), description: desc.trim() || undefined })
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally { setSaving(false) }
  }

  async function handleRemoveMember(psychologistId: string, memberName: string) {
    if (!confirm(`${memberName} takımdan çıkarılsın mı?`)) return
    try {
      const res = await fetch('/api/network', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_member', team_id: team.id, psychologist_id: psychologistId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`${memberName} takımdan çıkarıldı`)
      onSaved({})
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    }
  }

  const acceptedNonOwner = team.members?.filter(m => m.status === 'accepted' && m.role !== 'owner') ?? []

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Settings size={16} /> Takım Ayarları</h3>
          <button onClick={onClose} className="text-muted text-2xl leading-none hover:text-charcoal">×</button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          <form onSubmit={handleSave} className="space-y-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Takım Bilgileri</h4>
            <div>
              <label className="label">Takım Adı *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Açıklama <span className="text-muted font-normal">(opsiyonel)</span></label>
              <textarea className="input resize-none" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <Save size={14} /> {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
            </button>
          </form>

          {acceptedNonOwner.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Üyeleri Yönet</h4>
              <div className="space-y-2">
                {acceptedNonOwner.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {m.profile?.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.profile?.full_name}</p>
                      <p className="text-xs text-muted">{m.profile?.title}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(m.psychologist_id, m.profile?.full_name ?? 'Üye')}
                      className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
                      title="Takımdan çıkar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-border">
          <button onClick={onClose} className="btn-outline w-full justify-center text-sm">Kapat</button>
        </div>
      </div>
    </div>
  )
}

// ── Bağlantıdan Davet Modalı ──────────────────────────────────────────────
function InviteFromConnectionsModal({ teamId, currentMembers, onClose, onInvited }: {
  teamId: string
  currentMembers: TeamMember[]
  onClose: () => void
  onInvited: (member: TeamMember) => void
}) {
  const [connections, setConnections] = useState<{ id: string; full_name: string; title?: string; slug?: string }[]>([])
  const [loading, setLoading]         = useState(true)
  const [inviting, setInviting]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(data => {
        const sent     = (data.sentConnections     ?? []).filter((c: any) => c.status === 'accepted').map((c: any) => c.addressee)
        const received = (data.receivedConnections ?? []).filter((c: any) => c.status === 'accepted').map((c: any) => c.requester)
        const all = [...sent, ...received].filter(Boolean)
        const memberIds = new Set(currentMembers.map(m => m.psychologist_id))
        const seen = new Set<string>()
        const unique = all.filter((p: any) => {
          if (!p?.id || memberIds.has(p.id) || seen.has(p.id)) return false
          seen.add(p.id)
          return true
        })
        setConnections(unique)
      })
      .catch(() => toast.error('Bağlantılar yüklenemedi'))
      .finally(() => setLoading(false))
  }, [])

  async function inviteConnection(psyId: string, name: string) {
    setInviting(psyId)
    try {
      const res = await fetch('/api/network', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_member', team_id: teamId, psychologist_id: psyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${name} takıma davet edildi!`)
      const conn = connections.find(c => c.id === psyId)
      onInvited({
        id: data.id, psychologist_id: psyId, role: 'member', status: 'pending', joined_at: data.joined_at,
        profile: { id: psyId, full_name: conn?.full_name ?? name, title: conn?.title, slug: conn?.slug },
      })
      setConnections(c => c.filter(x => x.id !== psyId))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Davet gönderilemedi')
    } finally { setInviting(null) }
  }

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><UserPlus size={16} /> Bağlantıdan Davet Et</h3>
          <button onClick={onClose} className="text-muted text-2xl leading-none hover:text-charcoal">×</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
            </div>
          ) : connections.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={32} className="mx-auto text-muted opacity-30 mb-3" />
              <p className="text-sm text-muted">Davet edilebilecek bağlantı yok.</p>
              <p className="text-xs text-muted mt-1">Tüm bağlantılarınız zaten bu takımda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {connections.map(c => (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.full_name}</p>
                    <p className="text-xs text-muted truncate">{c.title}</p>
                  </div>
                  <button
                    onClick={() => inviteConnection(c.id, c.full_name)}
                    disabled={inviting === c.id}
                    className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 flex-shrink-0 disabled:opacity-60"
                  >
                    {inviting === c.id ? '…' : <><UserPlus size={12} /> Davet Et</>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-6 py-3 border-t border-border">
          <button onClick={onClose} className="btn-outline w-full justify-center text-sm">Kapat</button>
        </div>
      </div>
    </div>
  )
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
export default function TeamDashboardClient({ team: initialTeam, currentUserId, isOwner, userRole }: Props) {
  const [activeTab, setActiveTab]           = useState<Tab>('overview')
  const [team, setTeam]                     = useState(initialTeam)
  const [settingsOpen, setSettingsOpen]     = useState(false)
  const [inviteOpen, setInviteOpen]         = useState(false)

  const acceptedMembers = team.members?.filter(m => m.status === 'accepted') || []
  const pendingMembers  = team.members?.filter(m => m.status === 'pending')  || []
  const allMembers      = team.members || []

  const tabs = [
    { key: 'overview'  as Tab, label: 'Genel Bakış',         icon: Home         },
    { key: 'calendar'  as Tab, label: 'Takvim & Randevular', icon: Calendar     },
    { key: 'clients'   as Tab, label: 'Danışan Havuzu',      icon: Users        },
    { key: 'finance'   as Tab, label: 'Ortak Muhasebe',      icon: DollarSign   },
    { key: 'tests'     as Tab, label: 'Testler',             icon: FlaskConical  },
    { key: 'homework'  as Tab, label: 'Ödevler',             icon: BookOpen     },
    { key: 'archive'   as Tab, label: 'Klinik Arşivi',       icon: Archive      },
  ]

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Aktif Üye',     value: acceptedMembers.length, bg: 'bg-sage/10',   ic: 'text-sage',        Icon: Users        },
                { label: 'Bu Ay Randevu', value: '—',                    bg: 'bg-blue-50',   ic: 'text-blue-500',    Icon: Calendar     },
                { label: 'Bu Ay Gelir',   value: '—',                    bg: 'bg-green-50',  ic: 'text-green-600',   Icon: TrendingUp   },
                { label: 'Aktif Test',    value: '—',                    bg: 'bg-orange-50', ic: 'text-orange-500',  Icon: FileText     },
              ].map(s => (
                <div key={s.label} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <s.Icon className={`w-5 h-5 ${s.ic}`} />
                    </div>
                    <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted">{s.label}</p></div>
                  </div>
                </div>
              ))}
            </div>

            {pendingMembers.length > 0 && (
              <div className="card">
                <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold">Bekleyen Üyeler ({pendingMembers.length})</h3>
                </div>
                <div className="p-5 space-y-3">
                  {pendingMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-cream/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold">
                          {member.profile?.full_name?.charAt(0) || '?'}
                        </div>
                        <div><p className="text-sm font-medium">{member.profile?.full_name}</p><p className="text-xs text-muted">{member.profile?.title}</p></div>
                      </div>
                      <span className="pill-orange text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Bekliyor</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-sage" /> Takım Üyeleri</h3>
                <span className="text-xs text-muted">{acceptedMembers.length} üye</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {acceptedMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-white text-sm font-bold">
                        {member.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1"><p className="text-sm font-medium">{member.profile?.full_name}</p><p className="text-xs text-muted">{member.profile?.title}</p></div>
                      {member.role === 'owner' && <span className="text-xs font-bold text-amber-600">👑 Sahip</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {tabs.slice(1).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="card p-4 text-left hover:shadow-md transition-shadow group flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sage/10 flex items-center justify-center group-hover:bg-sage/20 transition-colors">
                    <tab.icon className="w-4 h-4 text-sage" />
                  </div>
                  <div><p className="text-sm font-medium">{tab.label}</p><p className="text-xs text-muted">Görüntüle →</p></div>
                </button>
              ))}
            </div>
          </div>
        )

      case 'calendar':  return <TeamCalendar teamId={team.id} />
      case 'clients':   return <TeamClients teamId={team.id} />
      case 'finance':   return <TeamFinance teamId={team.id} members={allMembers} />
      case 'tests':     return <TeamTests teamId={team.id} members={allMembers} />
      case 'homework':  return <TeamHomework teamId={team.id} members={allMembers} />
      case 'archive':   return <TeamArchive teamId={team.id} members={allMembers} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-cream/30">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-charcoal flex items-center justify-center">
                {team.avatar_url
                  ? <img src={team.avatar_url} alt={team.name} className="w-full h-full rounded-xl object-cover" />
                  : <span className="text-white font-bold text-lg">{team.name.charAt(0).toUpperCase()}</span>}
              </div>
              <div>
                <h1 className="font-serif text-xl">{team.name}</h1>
                {team.description && <p className="text-sm text-muted mt-0.5">{team.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href="/panel" className="btn-outline text-xs py-1.5 flex items-center gap-1.5">← Bireysel Panel</a>
              {isOwner && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="btn-outline flex items-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" /> Davet Et
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="btn-outline flex items-center gap-2 text-sm"
                >
                  <Settings className="w-4 h-4" /> Ayarlar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-border">
        <div className="px-4 md:px-8">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === key ? 'border-sage text-sage bg-sage/5' : 'border-transparent text-muted hover:text-charcoal'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="px-4 md:px-8 py-6">{renderTabContent()}</main>

      {settingsOpen && (
        <SettingsModal
          team={team}
          onClose={() => setSettingsOpen(false)}
          onSaved={updates => setTeam(t => ({ ...t, ...updates }))}
        />
      )}

      {inviteOpen && (
        <InviteFromConnectionsModal
          teamId={team.id}
          currentMembers={allMembers}
          onClose={() => setInviteOpen(false)}
          onInvited={member => setTeam(t => ({ ...t, members: [...(t.members ?? []), member] }))}
        />
      )}
    </div>
  )
}
