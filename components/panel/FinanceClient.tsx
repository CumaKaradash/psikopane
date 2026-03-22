'use client'
// components/panel/FinanceClient.tsx

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import type { FinanceEntry } from '@/lib/types'
import { Pencil, Trash2, Plus, Check, X, Download, BarChart2, List } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// ── Demo Paywall entegrasyonu ─────────────────────────────────────────────────
import { useDemoUser }  from '@/hooks/useDemoUser'
import DemoPaywallModal from '@/components/panel/DemoPaywallModal'
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  entries:      FinanceEntry[]
  income:       number
  expense:      number
  currentMonth: string  // "YYYY-MM" formatında — CSV ve grafik için
}

type FormState = { type: string; amount: string; description: string; entry_date: string }
const emptyForm = (): FormState => ({ type: 'income', amount: '', description: '', entry_date: '' })

export default function FinanceClient({ entries: initial, income, expense, currentMonth }: Props) {
  const [entries,      setEntries]     = useState(initial)
  const [addOpen,      setAddOpen]     = useState(false)
  const [loading,      setLoading]     = useState(false)
  const [form,         setForm]        = useState(emptyForm())
  const [editId,       setEditId]      = useState<string | null>(null)
  const [editForm,     setEditForm]    = useState(emptyForm())
  const [localIncome,  setLocalIncome]  = useState(income)
  const [localExpense, setLocalExpense] = useState(expense)
  const [exportLoading, setExportLoading] = useState(false)
  const [view,         setView]         = useState<'list' | 'chart'>('list')

  // ── Demo Paywall state ──────────────────────────────────────────────────────
  const { isDemoUser }                = useDemoUser()
  const [paywallOpen, setPaywallOpen] = useState(false)

  function guardDemo(): boolean {
    if (isDemoUser) { setPaywallOpen(true); return true }
    return false
  }
  // ───────────────────────────────────────────────────────────────────────────

  const net = localIncome - localExpense

  function recalc(list: FinanceEntry[]) {
    setLocalIncome(list.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0))
    setLocalExpense(list.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0))
  }

  // ── Ekle ─────────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (guardDemo()) return  // 🔒 Demo engeli

    if (!form.amount || !form.description) { toast.error('Tutar ve açıklama zorunlu'); return }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) { toast.error('Geçerli bir tutar girin'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: amt, entry_date: form.entry_date || new Date().toISOString().slice(0, 10) }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const entry: FinanceEntry = await res.json()
      const next = [entry, ...entries]
      setEntries(next); recalc(next)
      setAddOpen(false); setForm(emptyForm())
      toast.success('İşlem kaydedildi!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally { setLoading(false) }
  }

  // ── Düzenle aç ───────────────────────────────────────────────────────────
  function openEdit(e: FinanceEntry) {
    if (guardDemo()) return  // 🔒 Demo engeli
    setEditId(e.id)
    setEditForm({ type: e.type, amount: String(e.amount), description: e.description, entry_date: e.entry_date })
  }

  // ── Düzenle kaydet ───────────────────────────────────────────────────────
  async function handleEdit(id: string) {
    if (guardDemo()) return  // 🔒 Demo engeli

    const amt = parseFloat(editForm.amount)
    if (isNaN(amt) || amt <= 0 || !editForm.description) { toast.error('Geçerli veri girin'); return }
    try {
      const res = await fetch('/api/finance', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm, amount: amt }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated: FinanceEntry = await res.json()
      const next = entries.map(e => e.id === id ? updated : e)
      setEntries(next); recalc(next)
      setEditId(null)
      toast.success('Güncellendi')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    }
  }

  // ── Sil ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (guardDemo()) return  // 🔒 Demo engeli

    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return
    const res = await fetch(`/api/finance?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      const next = entries.filter(e => e.id !== id)
      setEntries(next); recalc(next)
      toast.success('Silindi')
    } else toast.error('Silinemedi')
  }

  // ── "İşlem Ekle" butonuna tıklanınca ──────────────────────────────────────
  function handleOpenAddModal() {
    if (guardDemo()) return  // 🔒 Demo engeli
    setAddOpen(true)
  }

  // ── CSV Dışa Aktar ────────────────────────────────────────────────────────
  // ── Grafik verisi ─────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const byDay: Record<string, { date: string; gelir: number; gider: number }> = {}
    for (const e of entries) {
      if (!byDay[e.entry_date]) byDay[e.entry_date] = { date: e.entry_date.slice(5), gelir: 0, gider: 0 }
      if (e.type === 'income')  byDay[e.entry_date].gelir  += e.amount
      if (e.type === 'expense') byDay[e.entry_date].gider  += e.amount
    }
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
  }, [entries])

  // ── CSV Dışa Aktar ────────────────────────────────────────────────────────
  async function handleExport() {
    if (guardDemo()) return
    setExportLoading(true)
    try {
      const url = `/api/finance/export?month=${currentMonth}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Dışa aktarma başarısız')
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `finans-${currentMonth}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('CSV indirildi!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6">

      {/* ── Demo Paywall Modal ───────────────────────────────────────────────── */}
      <DemoPaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />

      {/* ── Demo Banner ─────────────────────────────────────────────────────── */}
      {isDemoUser && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-base leading-none mt-0.5">🔒</span>
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Demo modundasınız.</span>{' '}
            Gelir/gider ekleyemez, düzenleyemez veya silemezsiniz.{' '}
            <button
              onClick={() => setPaywallOpen(true)}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              Tam sürümü başlatın →
            </button>
          </p>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wide">Toplam Gelir</p>
          <p className="font-serif text-3xl text-green-600 mt-1.5">₺{localIncome.toLocaleString('tr-TR')}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wide">Toplam Gider</p>
          <p className="font-serif text-3xl text-red-500 mt-1.5">₺{localExpense.toLocaleString('tr-TR')}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wide">Net Bakiye</p>
          <p className={`font-serif text-3xl mt-1.5 ${net >= 0 ? 'text-charcoal' : 'text-red-500'}`}>
            {net < 0 ? '-' : ''}₺{Math.abs(net).toLocaleString('tr-TR')}
          </p>
        </div>
      </div>

      {/* İşlem listesi */}
      <div className="card">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">İşlemler</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted hover:text-charcoal hover:bg-sand transition-colors disabled:opacity-50"
              title="Tüm işlemleri CSV olarak indir"
            >
              <Download size={13} />
              {exportLoading ? 'İndiriliyor…' : 'CSV İndir'}
            </button>
            <button
              onClick={() => setView(v => v === 'list' ? 'chart' : 'list')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted hover:text-charcoal hover:bg-sand transition-colors"
              title={view === 'list' ? 'Grafiği göster' : 'Listeyi göster'}
            >
              {view === 'list' ? <><BarChart2 size={13} /> Grafik</> : <><List size={13} /> Liste</>}
            </button>
            <button onClick={handleOpenAddModal} className="btn-primary flex items-center gap-1.5">
            {isDemoUser
              ? <><span className="text-xs">🔒</span> İşlem Ekle</>
              : <><Plus size={14} /> İşlem Ekle</>
            }
          </button>
          </div>
        </div>
        {/* ── Grafik görünümü ─────────────────────────────────────────── */}
        {view === 'chart' && (
          <div className="px-6 py-6">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">Bu ay kayıt yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-border-secondary)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-border-secondary)" tickFormatter={v => `₺${v.toLocaleString('tr-TR')}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`₺${value.toLocaleString('tr-TR')}`, name === 'gelir' ? 'Gelir' : 'Gider']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border-secondary)' }}
                  />
                  <Legend formatter={(v: string) => v === 'gelir' ? 'Gelir' : 'Gider'} />
                  <Bar dataKey="gelir"  fill="#5a7a6a" radius={[4,4,0,0]} />
                  <Bar dataKey="gider"  fill="#e57373" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ── Liste görünümü ───────────────────────────────────────────── */}
        {view === 'list' && (entries.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">Bu ay henüz işlem yok</p>
        ) : (
          <ul>
            {entries.map(e => (
              <li key={e.id} className="border-b border-border/60 last:border-0 hover:bg-cream/40 transition-colors group">
                {editId === e.id ? (
                  // ── Satır içi düzenleme formu ────────────────────────────
                  <div className="px-6 py-3 space-y-2">
                    <div className="flex gap-2">
                      {(['income', 'expense'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setEditForm(f => ({ ...f, type: t }))}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all
                            ${editForm.type === t
                              ? t === 'income' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700'
                              : 'border-border text-muted'}`}>
                          {t === 'income' ? '+ Gelir' : '− Gider'}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input className="input flex-1 text-sm" placeholder="Açıklama *"
                        value={editForm.description} onChange={ev => setEditForm(f => ({ ...f, description: ev.target.value }))} />
                      <input className="input w-28 text-sm" type="number" placeholder="Tutar ₺"
                        value={editForm.amount} onChange={ev => setEditForm(f => ({ ...f, amount: ev.target.value }))} />
                      <input className="input w-36 text-sm" type="date"
                        value={editForm.entry_date} onChange={ev => setEditForm(f => ({ ...f, entry_date: ev.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(e.id)}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"><Check size={12} /> Kaydet</button>
                      <button onClick={() => setEditId(null)}
                        className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1"><X size={12} /> İptal</button>
                    </div>
                  </div>
                ) : (
                  // ── Normal satır görünümü ────────────────────────────────
                  <div className="flex items-center gap-4 px-6 py-3.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.type === 'income' ? 'bg-green-500' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.description}</p>
                      <p className="text-xs text-muted">{new Date(e.entry_date + 'T00:00:00').toLocaleDateString('tr-TR')}</p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${e.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {e.type === 'income' ? '+' : '−'}₺{e.amount.toLocaleString('tr-TR')}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEdit(e)} title="Düzenle"
                        className="p-1.5 rounded hover:bg-cream text-muted hover:text-charcoal transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(e.id)} title="Sil"
                        className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>

      {/* Yeni işlem modal */}
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
                        ${form.type === t
                          ? t === 'income' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700'
                          : 'border-border text-muted hover:border-charcoal'}`}>
                      {t === 'income' ? '+ Gelir' : '− Gider'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Tutar (₺) *</label>
                <input className="input" type="number" min="1" step="0.01" required placeholder="0"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Açıklama *</label>
                <input className="input" required placeholder="ör. Seans ücreti — Zeynep Arslan"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Tarih</label>
                <input className="input" type="date"
                  value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddOpen(false)} className="btn-outline flex-1 justify-center">İptal</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60">
                  {loading ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
