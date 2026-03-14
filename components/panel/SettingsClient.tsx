'use client'
// components/panel/SettingsClient.tsx

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  User, Link2, FileText, DollarSign,
  Plus, Trash2, Save, Eye, Camera,
} from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props { profile: Profile }

function toSlug(text: string) {
  return text.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
}

type Tab = 'profile' | 'sessions' | 'appearance'

export default function SettingsClient({ profile: initial }: Props) {
  const [tab,     setTab]     = useState<Tab>('profile')
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)

  // Form alanları
  const [fullName,   setFullName]   = useState(initial.full_name  ?? '')
  const [title,      setTitle]      = useState(initial.title      ?? '')
  const [email,      setEmail]      = useState(initial.email      ?? '')
  const [phone,      setPhone]      = useState(initial.phone      ?? '')
  const [bio,        setBio]        = useState(initial.bio        ?? '')
  const [slug,       setSlug]       = useState(initial.slug       ?? '')
  const [avatarUrl,  setAvatarUrl]  = useState(initial.avatar_url ?? '')
  const [price,      setPrice]      = useState(String(initial.session_price ?? 0))

  // Seans türleri — [{ name, price }]
  const [sessionTypes, setSessionTypes] = useState<{ name: string; price: string }[]>(
    (initial.session_types ?? []).map(t => {
      const parts = t.split(' - ')
      return { name: parts[0] ?? t, price: parts[1] ?? '' }
    })
  )

  function addSessionType() {
    setSessionTypes(s => [...s, { name: '', price: '' }])
  }

  function removeSessionType(i: number) {
    setSessionTypes(s => s.filter((_, idx) => idx !== i))
  }

  function updateSessionType(i: number, field: 'name' | 'price', value: string) {
    setSessionTypes(s => s.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ))
  }

  async function handleSave() {
    if (!fullName.trim()) { toast.error('Ad Soyad zorunludur'); return }
    if (!slug.trim())     { toast.error('Profil URL\'i zorunludur'); return }

    setLoading(true)
    setSaved(false)
    try {
      const typesPayload = sessionTypes
        .filter(t => t.name.trim())
        .map(t => t.price.trim() ? `${t.name.trim()} - ${t.price.trim()}` : t.name.trim())

      const res = await fetch('/api/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:     fullName.trim(),
          title:         title.trim()    || null,
          email:         email.trim()    || null,
          phone:         phone.trim()    || null,
          bio:           bio.trim()      || null,
          slug:          slug.trim(),
          avatar_url:    avatarUrl.trim() || null,
          session_types: typesPayload,
          session_price: price ? parseInt(price) : 0,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSaved(true)
      toast.success('Profil güncellendi! ✓')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://psikopanel.tr'
  const publicUrl = `${origin}/${slug}`

  const TABS: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile',    label: 'Kişisel Bilgiler', icon: User     },
    { key: 'sessions',   label: 'Seans Türleri',    icon: DollarSign },
    { key: 'appearance', label: 'Görünüm & URL',    icon: Link2    },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Profil önizleme kartı */}
      <div className="card p-5 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-sage flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 relative">
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            : fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{fullName || 'Ad Soyad'}</p>
          <p className="text-sm text-muted truncate">{title || 'Unvan'}</p>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-sage hover:underline flex items-center gap-1 mt-0.5 truncate">
            <Eye size={11} /> {origin}/{slug || '…'}
          </a>
        </div>
        <a href={`/${slug}`} target="_blank" rel="noopener noreferrer"
          className="btn-outline text-xs py-1.5 px-3 flex-shrink-0 flex items-center gap-1">
          <Eye size={12} /> Önizle
        </a>
      </div>

      {/* Tab başlıkları */}
      <div className="flex gap-1 mb-6 bg-cream rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all
              ${tab === key ? 'bg-white shadow-sm text-charcoal' : 'text-muted hover:text-charcoal'}`}>
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── KİŞİSEL BİLGİLER ──────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Ad Soyad *</label>
              <input className="input" value={fullName}
                onChange={e => {
                  setFullName(e.target.value)
                  // Slug henüz değiştirilmediyse otomatik güncelle
                  if (slug === toSlug(initial.full_name))
                    setSlug(toSlug(e.target.value))
                }} />
            </div>
            <div>
              <label className="label">Unvan</label>
              <input className="input" placeholder="ör. Uzman Klinik Psikolog"
                value={title} onChange={e => setTitle(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">E-posta</label>
              <input className="input" type="email" placeholder="email@ornek.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input className="input" placeholder="05XX XXX XX XX"
                value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <FileText size={12} /> Hakkımda / Biyografi
            </label>
            <textarea className="input min-h-[120px] resize-y" rows={4}
              placeholder="Uzmanlık alanlarınız, terapi yaklaşımınız, çalıştığınız konular…"
              value={bio} onChange={e => setBio(e.target.value)} />
            <p className="text-[11px] text-muted mt-1">
              Bu metin randevu sayfanızda danışanlarınıza gösterilir.
            </p>
          </div>
        </div>
      )}

      {/* ── SEANS TÜRLERİ ─────────────────────────────────────────────────── */}
      {tab === 'sessions' && (
        <div className="card p-6 space-y-5">
          <div>
            <label className="label">Varsayılan Seans Ücreti (₺)</label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₺</span>
              <input className="input pl-7" type="number" min="0" placeholder="0"
                value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted mt-1">
              Randevu formunda gösterilecek genel ücret.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Seans Türleri</label>
              <button onClick={addSessionType}
                className="btn-outline py-1 px-2.5 text-xs flex items-center gap-1">
                <Plus size={12} /> Ekle
              </button>
            </div>

            {sessionTypes.length === 0 && (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-sm text-muted">
                Henüz seans türü eklenmedi.
                <button onClick={addSessionType}
                  className="text-sage hover:underline ml-1">İlk türü ekle →</button>
              </div>
            )}

            <div className="space-y-3">
              {sessionTypes.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input className="input" placeholder="ör. Bireysel Terapi"
                      value={item.name}
                      onChange={e => updateSessionType(i, 'name', e.target.value)} />
                  </div>
                  <div className="w-32 flex-shrink-0 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₺</span>
                    <input className="input pl-7" type="number" min="0" placeholder="0"
                      value={item.price}
                      onChange={e => updateSessionType(i, 'price', e.target.value)} />
                  </div>
                  <button onClick={() => removeSessionType(i)}
                    className="p-2 text-muted hover:text-red-500 transition-colors mt-0.5 flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {sessionTypes.length > 0 && (
              <p className="text-[11px] text-muted mt-3">
                Bu türler randevu formundaki "Seans Türü" açılır listesinde görünür.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── GÖRÜNÜM & URL ──────────────────────────────────────────────────── */}
      {tab === 'appearance' && (
        <div className="card p-6 space-y-5">
          <div>
            <label className="label flex items-center gap-1.5">
              <Link2 size={12} /> Profil URL'i *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">
                {origin}/
              </span>
              <input className="input font-mono" placeholder="ad-soyad"
                value={slug}
                onChange={e => setSlug(toSlug(e.target.value))} />
            </div>
            <p className="text-[11px] text-muted mt-1">
              Randevu sayfanız:{' '}
              <a href={`/${slug}/booking`} target="_blank"
                className="text-sage hover:underline">{origin}/{slug}/booking</a>
            </p>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Camera size={12} /> Profil Fotoğrafı (URL)
            </label>
            <input className="input" type="url" placeholder="https://…"
              value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
            <p className="text-[11px] text-muted mt-1">
              Fotoğraf URL'i girin. Supabase Storage veya harici bir CDN kullanabilirsiniz.
            </p>
            {avatarUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img src={avatarUrl} alt="Önizleme"
                  className="w-16 h-16 rounded-full object-cover border border-border" />
                <p className="text-xs text-muted">Fotoğraf önizlemesi</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kaydet butonu */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-xs text-muted">
          {saved && <span className="text-green-600 font-medium">✓ Kaydedildi</span>}
        </p>
        <button onClick={handleSave} disabled={loading}
          className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-60">
          <Save size={15} />
          {loading ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  )
}
