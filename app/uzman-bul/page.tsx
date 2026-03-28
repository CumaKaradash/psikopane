'use client'
// app/uzman-bul/page.tsx

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Brain, Search, MapPin, SlidersHorizontal, X,
  User, ChevronRight, Star, ArrowLeft, Loader2,
} from 'lucide-react'

type Profile = {
  id: string
  slug: string
  full_name: string
  title: string | null
  bio: string | null
  session_types: string[]
  session_price: number
  avatar_url: string | null
}

// Seans türlerinden temiz etiket üret (fiyat kısmını çıkar)
function labelOf(raw: string) {
  return raw.split(' - ')[0].trim()
}

// Benzersiz seans türlerini topla
function collectTypes(profiles: Profile[]) {
  const set = new Set<string>()
  profiles.forEach(p =>
    (p.session_types ?? []).forEach(t => set.add(labelOf(t)))
  )
  return Array.from(set).sort()
}

function Avatar({ profile }: { profile: Profile }) {
  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name}
        className="w-full h-full object-cover"
      />
    )
  }
  return (
    <span
      className="text-xl font-bold"
      style={{ color: 'var(--sage)' }}
    >
      {initials}
    </span>
  )
}

export default function UzmanBulPage() {
  const [profiles, setProfiles]     = useState<Profile[]>([])
  const [filtered, setFiltered]     = useState<Profile[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [activeType, setActiveType] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const allTypes = collectTypes(profiles)

  // İlk yükleme
  useEffect(() => {
    fetch('/api/uzmanlar')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProfiles(data)
          setFiltered(data)
        } else {
          setError('Uzmanlar yüklenemedi.')
        }
      })
      .catch(() => setError('Bağlantı hatası.'))
      .finally(() => setLoading(false))
  }, [])

  // Filtre uygula
  const applyFilters = useCallback(
    (q: string, type: string | null, all: Profile[]) => {
      let result = all
      if (q.trim()) {
        const lower = q.toLowerCase()
        result = result.filter(
          p =>
            p.full_name.toLowerCase().includes(lower) ||
            (p.title ?? '').toLowerCase().includes(lower) ||
            (p.bio ?? '').toLowerCase().includes(lower)
        )
      }
      if (type) {
        result = result.filter(p =>
          (p.session_types ?? []).some(t => labelOf(t) === type)
        )
      }
      setFiltered(result)
    },
    []
  )

  useEffect(() => {
    applyFilters(query, activeType, profiles)
  }, [query, activeType, profiles, applyFilters])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>

      {/* ── NAVBAR ── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: 'rgba(250,248,244,0.92)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--sage)' }}
            >
              <Brain size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--charcoal)' }}>
              psiko<span style={{ color: 'var(--sage)' }}>panel</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <ArrowLeft size={14} />
            Ana Sayfa
          </Link>
        </div>
      </nav>

      {/* ── HERO BAŞLIK ── */}
      <div
        className="border-b py-12"
        style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: 'var(--sage)' }}
          >
            Uzman Ara
          </p>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--charcoal)' }}
          >
            Size uygun psikoloğu bulun
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            {loading
              ? 'Uzmanlar yükleniyor…'
              : `${profiles.length} kayıtlı uzman arasından arama yapın`}
          </p>

          {/* Arama kutusu */}
          <div className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--muted)' }}
              />
              <input
                type="text"
                placeholder="İsim, unvan veya uzmanlık alanı…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="input pl-10 h-11 text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                  style={{ color: 'var(--muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || activeType
                  ? 'text-white'
                  : 'text-charcoal'
              }`}
              style={{
                borderColor: showFilters || activeType ? 'var(--sage)' : 'var(--border)',
                backgroundColor: showFilters || activeType ? 'var(--sage)' : 'white',
              }}
            >
              <SlidersHorizontal size={14} />
              Filtrele
              {activeType && (
                <span
                  className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'white', color: 'var(--sage)' }}
                >
                  1
                </span>
              )}
            </button>
          </div>

          {/* Seans türü filtreleri */}
          {showFilters && allTypes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 max-w-2xl">
              {allTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(activeType === type ? null : type)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor:
                      activeType === type ? 'var(--sage)' : 'var(--sage-pale)',
                    color: activeType === type ? 'white' : 'var(--sage)',
                    borderColor:
                      activeType === type ? 'var(--sage)' : 'var(--sage-l)',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LİSTE ── */}
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Aktif filtre bildirimi */}
        {(query || activeType) && !loading && (
          <div className="flex items-center gap-3 mb-6">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--charcoal)' }}>
                {filtered.length}
              </span>{' '}
              sonuç
            </p>
            <button
              onClick={() => { setQuery(''); setActiveType(null) }}
              className="text-xs flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              <X size={11} /> Filtreleri Temizle
            </button>
          </div>
        )}

        {/* Yükleniyor */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2
              size={28}
              className="animate-spin"
              style={{ color: 'var(--sage)' }}
            />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Uzmanlar yükleniyor…
            </p>
          </div>
        )}

        {/* Hata */}
        {error && !loading && (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--charcoal)' }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs mt-2"
              style={{ color: 'var(--sage)' }}
            >
              Tekrar dene
            </button>
          </div>
        )}

        {/* Sonuç yok */}
        {!loading && !error && filtered.length === 0 && (
          <div
            className="rounded-xl border p-12 text-center"
            style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}
          >
            <Search
              size={32}
              className="mx-auto mb-4 opacity-20"
              style={{ color: 'var(--muted)' }}
            />
            <p className="font-medium mb-1" style={{ color: 'var(--charcoal)' }}>
              {profiles.length === 0
                ? 'Henüz kayıtlı uzman bulunmuyor.'
                : 'Aramanızla eşleşen uzman bulunamadı.'}
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {profiles.length > 0
                ? 'Farklı anahtar kelimeler deneyin veya filtreleri temizleyin.'
                : 'İlk kaydolan uzman olmak için psikopanel\'e katılın!'}
            </p>
            {(query || activeType) && (
              <button
                onClick={() => { setQuery(''); setActiveType(null) }}
                className="mt-4 text-sm font-medium"
                style={{ color: 'var(--sage)' }}
              >
                Filtreleri temizle →
              </button>
            )}
          </div>
        )}

        {/* Uzman kartları */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(profile => (
              <ExpertCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ExpertCard({ profile }: { profile: Profile }) {
  const types = (profile.session_types ?? []).map(labelOf)

  return (
    <div
      className="rounded-xl border overflow-hidden transition-shadow hover:shadow-md group"
      style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
    >
      {/* Üst bölüm — avatar + isim */}
      <div
        className="p-5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: 'var(--sage-pale)' }}
          >
            <Avatar profile={profile} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="font-semibold text-sm leading-tight truncate"
              style={{ color: 'var(--charcoal)' }}
            >
              {profile.full_name}
            </h3>
            {profile.title && (
              <p
                className="text-xs mt-0.5 truncate"
                style={{ color: 'var(--muted)' }}
              >
                {profile.title}
              </p>
            )}
            {profile.session_price > 0 && (
              <p
                className="text-xs font-semibold mt-1.5"
                style={{ color: 'var(--sage)' }}
              >
                ₺{profile.session_price.toLocaleString('tr-TR')} / seans
              </p>
            )}
          </div>
        </div>

        {/* Biyografi */}
        {profile.bio && (
          <p
            className="text-xs leading-relaxed mt-3 line-clamp-2"
            style={{ color: 'var(--muted)' }}
          >
            {profile.bio}
          </p>
        )}
      </div>

      {/* Seans türleri */}
      {types.length > 0 && (
        <div className="px-5 py-3 border-b flex flex-wrap gap-1.5" style={{ borderColor: 'var(--border)' }}>
          {types.slice(0, 3).map(t => (
            <span key={t} className="pill-sage text-[10px]">{t}</span>
          ))}
          {types.length > 3 && (
            <span
              className="text-[10px] font-medium"
              style={{ color: 'var(--muted)' }}
            >
              +{types.length - 3} daha
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="px-5 py-3 flex gap-2">
        <Link
          href={`/${profile.slug}`}
          className="flex-1 text-xs font-medium py-2 rounded-lg text-center border transition-colors"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--charcoal)',
          }}
        >
          Profili Görüntüle
        </Link>
        <Link
          href={`/${profile.slug}/booking`}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--sage)' }}
        >
          Randevu Al
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}
