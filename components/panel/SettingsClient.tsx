'use client'
// components/panel/SettingsClient.tsx

import { toSlug } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  User, Link2, FileText, DollarSign,
  Plus, Trash2, Save, Eye, Camera, Lock, Users,
} from 'lucide-react'
import type { Profile } from '@/lib/types'

// ── Demo Paywall entegrasyonu ─────────────────────────────────────────────────
import { useDemoUser }  from '@/hooks/useDemoUser'
import DemoPaywallModal from '@/components/panel/DemoPaywallModal'
import { createClient } from '@/lib/supabase/client'
// ─────────────────────────────────────────────────────────────────────────────

interface Props { profile: Profile }


type Tab = 'profile' | 'sessions' | 'appearance' | 'teams'

// ── Takımlar Sekmesi (kendi bağımsız state'i olan alt bileşen) ─────────────
function TeamsTab() {
  const [teams, setTeams]         = useState<any[]>([])
  const [invites, setInvites]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(data => {
        setTeams(data.teams ?? [])
        setInvites((data.teamInvitations ?? []).filter((i: any) => i.status === 'pending'))
      })
      .catch(() => toast.error('Takımlar yüklenemedi'))
      .finally(() => setLoading(false))
  }, [])

  async function respondInvite(teamId: string, status: 'accepted' | 'rejected') {
    const res = await fetch('/api/network', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'respond_team_invite', team_id: teamId, status }),
    })
    if (res.ok) {
      setInvites(iv => iv.filter(i => i.team_id !== teamId))
      if (status === 'accepted') {
        toast.success('Takıma katıldınız!')
        fetch('/api/network').then(r => r.json()).then(data => setTeams(data.teams ?? []))
      } else {
        toast.success('Davet reddedildi')
      }
    } else {
      toast.error('İşlem başarısız')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Bekleyen davetler */}
      {invites.length > 0 && (
        <div className="card p-5 border-l-4 border-l-amber-400">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="text-amber-500">📬</span> Bekleyen Takım Davetleri ({invites.length})
          </h3>
          <div className="space-y-3">
            {invites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-cream/60 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{inv.team?.name ?? 'Bilinmeyen Takım'}</p>
                  {inv.team?.description && <p className="text-xs text-muted">{inv.team.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondInvite(inv.team_id, 'accepted')}
                    className="btn-primary py-1.5 px-3 text-xs"
                  >
                    Kabul Et
                  </button>
                  <button
                    onClick={() => respondInvite(inv.team_id, 'rejected')}
                    className="btn-outline py-1.5 px-3 text-xs text-red-500 border-red-200 hover:bg-red-50"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takım listesi */}
      <div className="card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users size={14} className="text-sage" /> Takımlarım
          </h3>
          <a href="/panel/network?tab=teams" className="text-xs text-sage hover:underline">
            Takım Yönetimi →
          </a>
        </div>
        {teams.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users size={32} className="mx-auto text-muted opacity-30 mb-3" />
            <p className="text-sm text-muted">Henüz bir takımınız yok.</p>
            <a href="/panel/network" className="text-xs text-sage hover:underline mt-1 inline-block">
              Meslektaş Ağı'ndan takım oluşturun →
            </a>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {teams.map((team: any) => {
              const acceptedCount = (team.members ?? []).filter((m: any) => m.status === 'accepted').length
              return (
                <div key={team.id} className="px-5 py-4 hover:bg-cream/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-charcoal flex items-center justify-center flex-shrink-0">
                        {team.avatar_url
                          ? <img src={team.avatar_url} alt={team.name} className="w-full h-full rounded-xl object-cover" />
                          : <span className="text-white font-bold text-sm">{team.name?.charAt(0)?.toUpperCase()}</span>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">{team.name}</p>
                        <p className="text-xs text-muted">{acceptedCount} üye · Sahip</p>
                      </div>
                    </div>
                    <a
                      href={`/panel/takimlar/${team.slug}`}
                      className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Users size={12} /> Panele Git
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted text-center">
        Takım oluşturmak ve üye davet etmek için{' '}
        <a href="/panel/network" className="text-sage hover:underline">Meslektaş Ağı</a>'nı kullanın.
      </p>
    </div>
  )
}

export default function SettingsClient({ profile: initial }: Props) {
  const [tab,     setTab]     = useState<Tab>('profile')
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)

  // ── Demo Paywall state ──────────────────────────────────────────────────────
  const { isDemoUser }                = useDemoUser()
  const [paywallOpen, setPaywallOpen] = useState(false)

  /** true dönerse çağıran fonksiyon return etmeli */
  function guardDemo(): boolean {
    if (isDemoUser) { setPaywallOpen(true); return true }
    return false
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Form alanları
  const [fullName,  setFullName]  = useState(initial.full_name  ?? '')
  const [title,     setTitle]     = useState(initial.title      ?? '')
  const [email,     setEmail]     = useState(initial.email      ?? '')
  const [phone,     setPhone]     = useState(initial.phone      ?? '')
  const [bio,       setBio]       = useState(initial.bio        ?? '')
  const [slug,      setSlug]      = useState(initial.slug       ?? '')
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [price,     setPrice]     = useState(String(initial.session_price ?? 0))

  // Seans türleri — [{ name, price }]
  const [sessionTypes, setSessionTypes] = useState<{ name: string; price: string }[]>(
    (initial.session_types ?? []).map(t => {
      const parts = t.split(' - ')
      return { name: parts[0] ?? t, price: parts[1] ?? '' }
    })
  )

  function addSessionType() {
    if (guardDemo()) return   // 🔒
    setSessionTypes(s => [...s, { name: '', price: '' }])
  }

  function removeSessionType(i: number) {
    if (guardDemo()) return   // 🔒
    setSessionTypes(s => s.filter((_, idx) => idx !== i))
  }

  function updateSessionType(i: number, field: 'name' | 'price', value: string) {
    setSessionTypes(s => s.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ))
  }

  // ── Fotoğraf yükle ───────────────────────────────────────────────────────
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (guardDemo()) return
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Yalnızca resim dosyası yükleyebilirsiniz'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error("Dosya boyutu 2 MB'ı geçemez"); return }

    setAvatarUploading(true)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${initial.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('psychologist-documents')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('psychologist-documents').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
      toast.success('Fotoğraf yüklendi! Kaydetmeyi unutmayın.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Yükleme başarısız')
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  // ── Profili kaydet ────────────────────────────────────────────────────────
  async function handleSave() {
    if (guardDemo()) return   // 🔒 Demo engeli

    // Avatar URL doğrulama — javascript: / data: URI'larına izin verme
    if (avatarUrl && avatarUrl.trim()) {
      try {
        const parsed = new URL(avatarUrl.trim())
        if (parsed.protocol !== 'https:') {
          toast.error("Profil fotoğrafı URL'i https:// ile başlamalıdır")
          return
        }
      } catch {
        toast.error('Geçersiz profil fotoğrafı URL formatı')
        return
      }
    }

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
          title:         title.trim()     || null,
          email:         email.trim()     || null,
          phone:         phone.trim()     || null,
          bio:           bio.trim()       || null,
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

  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const publicUrl = `${origin}/${slug}`

  const TABS: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile',    label: 'Kişisel Bilgiler', icon: User       },
    { key: 'sessions',   label: 'Seans Türleri',    icon: DollarSign },
    { key: 'appearance', label: 'Görünüm & URL',    icon: Link2      },
    { key: 'teams',      label: 'Takımlarım',       icon: Users      },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* ── Demo Paywall Modal ───────────────────────────────────────────────── */}
      <DemoPaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />

      {/* ── Demo Banner ─────────────────────────────────────────────────────── */}
      {isDemoUser && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Lock size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Demo modundasınız.</span>{' '}
            Profil bilgilerini kaydedebilir, seans türlerini veya görünüm ayarlarını güncelleyemezsiniz.{' '}
            <button
              onClick={() => setPaywallOpen(true)}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              Tam sürümü başlatın →
            </button>
          </p>
        </div>
      )}

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
            <Eye size={11} /> {origin ? `${origin}/${slug || '…'}` : slug || '…'}
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
            <textarea className="input min-h-[160px] resize-y" rows={6}
              placeholder="Uzmanlık alanlarınız, terapi yaklaşımınız, çalıştığınız konular, deneyiminiz…&#10;&#10;Örnek: 10 yıllık klinik deneyimimle bireysel terapi, anksiyete ve depresyon tedavisinde uzmanlaştım."
              value={bio} onChange={e => setBio(e.target.value)} />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-muted">
                Bu metin profil sayfanızda (<span className="font-mono text-sage">{origin ? `${origin}/${slug}` : `/${slug}`}</span>) danışanlarınıza gösterilir.
              </p>
              <span className={`text-[10px] font-medium ${bio.length > 500 ? 'text-orange-500' : 'text-muted'}`}>
                {bio.length} / 800
              </span>
            </div>
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
            <p className="text-[11px] text-muted mt-1">Randevu formunda gösterilecek genel ücret.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Seans Türleri</label>
              <button onClick={addSessionType}
                className="btn-outline py-1 px-2.5 text-xs flex items-center gap-1">
                {isDemoUser ? <><Lock size={11} /> Ekle</> : <><Plus size={12} /> Ekle</>}
              </button>
            </div>

            {sessionTypes.length === 0 && (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-sm text-muted">
                Henüz seans türü eklenmedi.
                <button onClick={addSessionType} className="text-sage hover:underline ml-1">İlk türü ekle →</button>
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
              <Link2 size={12} /> Profil Adresi *
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
              <Camera size={12} /> Profil Fotoğrafı
            </label>
            <div className="flex items-center gap-3 mt-1">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover border border-border flex-shrink-0" />
                : <div className="w-14 h-14 rounded-full bg-sage-pale flex items-center justify-center text-sage flex-shrink-0"><Camera size={20} /></div>
              }
              <div className="flex-1 space-y-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  type="button"
                  onClick={() => { if (guardDemo()) return; avatarInputRef.current?.click() }}
                  disabled={avatarUploading}
                  className="btn-outline w-full justify-center disabled:opacity-60"
                >
                  {avatarUploading ? 'Yükleniyor…' : 'Bilgisayardan Yükle'}
                </button>
                <input className="input text-xs" type="url" placeholder="veya https:// ile URL yapıştır"
                  value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted mt-1.5">Maks. 2 MB · JPG, PNG, WebP desteklenir</p>
          </div>
        </div>
      )}

      {/* ── TAKIMLARIM ────────────────────────────────────────────────────── */}
      {tab === 'teams' && (
        <TeamsTab />
      )}

      {/* ── Kaydet butonu ──────────────────────────────────────────────────── */}
      {tab !== 'teams' && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-muted">
            {saved && <span className="text-green-600 font-medium">✓ Kaydedildi</span>}
          </p>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-60"
          >
            {isDemoUser
              ? <><Lock size={14} /> Kaydet (Demo Kısıtlı)</>
              : <><Save size={15} /> {loading ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
