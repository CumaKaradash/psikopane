// lib/utils.ts — Ortak yardımcı fonksiyonlar

// ── UTC ISO string'i Türkiye lokal tarihe çevirir (YYYY-MM-DD) ───────────────
// starts_at veritabanında UTC olarak saklanır; .slice(0,10) UTC günü verir.
// TR'de gece 02:00 = UTC 23:00 önceki gün → yanlış güne atanır.
// Bu fonksiyon her zaman kullanıcının lokal saat dilimine göre tarihi döndürür.
export function localDateKey(isoString: string): string {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Türkçe karakterleri normalize edip URL-güvenli slug üretir ───────────────
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    || 'sayfa'
}

// ── Yalnızca https:// ile başlayan URL'leri kabul eder ─────────────────────
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}
