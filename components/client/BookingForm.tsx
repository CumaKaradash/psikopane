'use client'
// components/client/BookingForm.tsx
// Bireysel profil veya Takım/Klinik için ortak form.
// Takım modunda danışan hangi psikologla görüşmek istediğini seçer.

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { BookingContext } from '@/lib/types'

interface Props {
  ctx: BookingContext
}

const DEFAULT_SESSION_TYPES = ['Bireysel Terapi', 'İlk Görüşme', 'Online Seans']

// ─────────────────────────────────────────────────────────────────────────────
export default function BookingForm({ ctx }: Props) {
  // Geriye dönük uyumluluk: eski `profile` prop'u gelirse ctx'e dönüştür
  const resolvedCtx: BookingContext = ctx

  const isTeam   = resolvedCtx.type === 'team'
  const teamData = isTeam ? resolvedCtx.team        : null
  const members  = isTeam ? resolvedCtx.teamMembers : null

  // Bireysel veya seçilen üyenin profili
  const individualProfile = isTeam ? null : resolvedCtx.profile

  // Takımda hangi uzman seçildi
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members?.[0]?.psychologist_id ?? ''
  )

  // Seçili üyenin profili (oturum türleri için)
  const selectedMember = members?.find(m => m.psychologist_id === selectedMemberId)
  const activeProfile  = isTeam ? selectedMember?.profile : individualProfile

  const sessionTypes = (activeProfile?.session_types?.length ?? 0) > 0
    ? (activeProfile!.session_types)
    : (isTeam ? (teamData?.session_types ?? DEFAULT_SESSION_TYPES) : DEFAULT_SESSION_TYPES)

  const [submitted,      setSubmitted]      = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [busySlots,      setBusySlots]      = useState<string[]>([])
  const [notifyConsent,  setNotifyConsent]  = useState(false)

  const [form, setForm] = useState({
    first_name:   '',
    last_name:    '',
    guest_phone:  '',
    guest_email:  '',
    session_type: sessionTypes[0] ?? 'Bireysel Terapi',
    starts_at:    '',
    guest_note:   '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Uzman değişince oturum türünü sıfırla
  useEffect(() => {
    setForm(f => ({ ...f, session_type: sessionTypes[0] ?? 'Bireysel Terapi' }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId])

  // Psikologun meşgul saatlerini çek
  useEffect(() => {
    const psychId = isTeam ? selectedMemberId : (activeProfile?.id ?? '')
    if (!psychId) return
    const from = new Date().toISOString()
    const to   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    fetch(`/api/appointments/busy?psychologist_id=${psychId}&from=${from}&to=${to}`)
      .then(r => r.ok ? r.json() : [])
      .then(slots => setBusySlots(Array.isArray(slots) ? slots : []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, activeProfile?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim()) { toast.error('Ad zorunludur'); return }
    if (!form.guest_phone.trim()) { toast.error('Telefon zorunludur'); return }
    if (!form.guest_email.trim()) { toast.error('E-posta zorunludur'); return }
    if (isTeam && !selectedMemberId) { toast.error('Lütfen bir uzman seçin'); return }

    setLoading(true)
    try {
      const guest_name      = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
      const psychologist_id = isTeam ? selectedMemberId : individualProfile!.id

      const res = await fetch('/api/appointments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name,
          guest_phone:       form.guest_phone,
          guest_email:       form.guest_email,
          guest_note:        form.guest_note || null,
          session_type:      form.session_type,
          starts_at:         form.starts_at
            ? new Date(form.starts_at).toISOString()
            : new Date().toISOString(),
          psychologist_id,
          notify_consent:    notifyConsent ?? false,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 429) throw new Error(err.error ?? 'Çok fazla istek, lütfen bekleyin.')
        throw new Error(err.error ?? 'Sunucu hatası')
      }

      setSubmitted(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bir hata oluştu, lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // ── Başarı ekranı ─────────────────────────────────────────────────────────
  if (submitted) {
    const expertName = isTeam
      ? (selectedMember?.profile.full_name ?? 'Uzman')
      : individualProfile!.full_name

    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="font-serif text-2xl mb-2">Talebiniz Alındı!</h2>
        <p className="text-sm text-muted leading-relaxed">
          <strong>{expertName}</strong> en kısa sürede sizinle{' '}
          telefon veya e-posta ile iletişime geçecektir.
        </p>
        {notifyConsent && (
          <p className="text-xs text-sage mt-4 bg-sage-pale rounded-lg px-4 py-2">
            🔔 Randevu hatırlatmaları için bildirim tercihiniz kaydedildi.
          </p>
        )}
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Uzman seçimi (yalnızca takım modunda) ─────────────────────────── */}
      {isTeam && members && members.length > 0 && (
        <div>
          <label className="label">
            Hangi Uzman ile Görüşmek İstersiniz? *
          </label>
          <div className="space-y-2">
            {members.map(m => (
              <label key={m.psychologist_id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                  ${selectedMemberId === m.psychologist_id
                    ? 'border-sage bg-sage-pale'
                    : 'border-border hover:border-sage hover:bg-sage-pale/40'}`}>
                <input
                  type="radio"
                  name="expert"
                  value={m.psychologist_id}
                  checked={selectedMemberId === m.psychologist_id}
                  onChange={() => setSelectedMemberId(m.psychologist_id)}
                  className="sr-only"
                />
                {/* Radiobutton görseli */}
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${selectedMemberId === m.psychologist_id ? 'border-sage' : 'border-border'}`}>
                  {selectedMemberId === m.psychologist_id && (
                    <div className="w-2 h-2 rounded-full bg-sage" />
                  )}
                </div>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {m.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.profile.full_name}</p>
                  <p className="text-xs text-muted truncate">{m.profile.title ?? 'Psikolog'}</p>
                </div>
                {m.role === 'owner' && (
                  <span className="ml-auto text-[10px] text-accent font-semibold flex-shrink-0">
                    Kurucu
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Kişisel bilgiler ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Ad *</label>
          <input className="input" placeholder="Adınız"
            value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Soyad</label>
          <input className="input" placeholder="Soyadınız"
            value={form.last_name} onChange={e => set('last_name', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Telefon *</label>
        <input className="input" type="tel" placeholder="05XX XXX XX XX"
          value={form.guest_phone} onChange={e => set('guest_phone', e.target.value)} required />
      </div>

      <div>
        <label className="label">E-posta *</label>
        <input className="input" type="email" placeholder="email@ornek.com"
          value={form.guest_email} onChange={e => set('guest_email', e.target.value)} required />
        <p className="text-[11px] text-muted mt-1">
          Randevu onayı ve hatırlatma e-postası bu adrese gönderilir.
        </p>
      </div>

      <div>
        <label className="label">Seans Türü</label>
        <select className="input" value={form.session_type}
          onChange={e => set('session_type', e.target.value)}>
          {sessionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Tercih Ettiğiniz Tarih / Saat</label>
        <input className="input" type="datetime-local"
          value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
        {form.starts_at && busySlots.some(busy => {
          const selected = new Date(form.starts_at).getTime()
          const busyStart = new Date(busy).getTime()
          return Math.abs(selected - busyStart) < 60 * 60 * 1000 // 1 saatlik pencere
        }) && (
          <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
            ⚠ Seçtiğiniz saat dolu veya yakın randevu var. Lütfen başka bir saat deneyin.
          </p>
        )}
      </div>

      <div>
        <label className="label">Belirtmek İstedikleriniz</label>
        <textarea className="input min-h-[80px] resize-y" rows={3}
          placeholder="Neden terapi almayı düşündüğünüzü veya eklemek istediğiniz herhangi bir şeyi yazabilirsiniz."
          value={form.guest_note} onChange={e => set('guest_note', e.target.value)} />
      </div>

      {/* Bildirim onayı */}
      <label className="flex items-start gap-3 cursor-pointer select-none group">
        <div className="relative mt-0.5 flex-shrink-0">
          <input type="checkbox" className="sr-only"
            checked={notifyConsent} onChange={e => setNotifyConsent(e.target.checked)} />
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
            ${notifyConsent ? 'bg-sage border-sage' : 'border-border group-hover:border-sage'}`}>
            {notifyConsent && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs text-muted leading-relaxed">
          Randevu detaylarını ve hatırlatmalarını{' '}
          <strong>e-posta</strong>
olarak almayı kabul ediyorum.
        </span>
      </label>

      <button type="submit" disabled={loading}
        className="btn-primary w-full justify-center py-3 text-sm font-semibold disabled:opacity-60">
        {loading ? 'Gönderiliyor…' : 'Randevu Talebi Gönder →'}
      </button>

      <p className="text-center text-[11px] text-muted">
        Üye olmak gerekmez · Bilgileriniz gizli tutulur
      </p>
    </form>
  )
}
