'use client'
// components/panel/FinanceClient.tsx
// DÜZELTME: month prop kaldırıldı (dead prop), delete eklendi

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { FinanceEntry } from '@/lib/types'

interface Props {
  entries: FinanceEntry[]
  income: number
  expense: number
}

export default function FinanceClient({ entries: initial, income, expense }: Props) {
  const [entries, setEntries]         = useState(initial)
  const [addOpen, setAddOpen]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [form, setForm]               = useState({ type: 'income', amount: '', description: '', entry_date: '' })
  const [localIncome, setLocalIncome]   = useState(income)
  const [localExpense, setLocalExpense] = useState(expense)

  const net = localIncome - localExpense

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.description) { toast.error('Tutar ve açıklama zorunlu'); return }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) { toast.error('Geçerli bir tutar girin'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: amt,
          entry_date: form.entry_date || new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const entry: FinanceEntry = await res.json()
      setEntries(es => [entry, ...es])
      if (entry.type === 'income')  setLocalIncome(v  => v + entry.amount)
      else                          setLocalExpense(v => v + entry.amount)
      setAddOpen(false)
      setForm({ type: 'income', amount: '', description: '', entry_date: '' })
      toast.success('İşlem kaydedildi!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
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
          <button onClick={() => setAddOpen(true)} className="btn-primary">+ İşlem Ekle</button>
        </div>
        {entries.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">Bu ay henüz işlem yok</p>
        ) : (
          <ul>
            {entries.map(e => (
              <li key={e.id} className="flex items-center gap-4 px-6 py-3.5 border-b border-border/60 last:border-0 hover:bg-cream/40 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.type === 'income' ? 'bg-green-500' : 'bg-red-400'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{e.description}</p>
                  <p className="text-xs text-muted">{new Date(e.entry_date + 'T00:00:00').toLocaleDateString('tr-TR')}</p>
                </div>
                <span className={`text-sm font-semibold ${e.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {e.type === 'income' ? '+' : '−'}₺{e.amount.toLocaleString('tr-TR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal */}
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
                    <button key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
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
