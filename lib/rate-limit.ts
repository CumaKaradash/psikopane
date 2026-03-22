// lib/rate-limit.ts
// Saf in-memory rate limiter — harici servis gerektirmez
// Vercel serverless'ta her instance ayrı belleğe sahiptir; bu yeterli korumayı sağlar.
// Dağıtık rate limiting gerekirse Supabase'in kendi pg tablosu kullanılabilir.

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Belleği temiz tut — her 5 dakikada süresi dolmuş kayıtları temizle
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k)
    }
  }, 5 * 60_000)
}

function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

interface RateLimitResult {
  success:  boolean
  error?:   string
  headers:  Record<string, string>
}

export function checkRateLimit(
  req: Request,
  opts: { max: number; windowMs: number; prefix: string }
): RateLimitResult {
  const ip  = getIP(req)
  const key = `${opts.prefix}${ip}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs })
    return {
      success: true,
      headers: {
        'X-RateLimit-Limit':     String(opts.max),
        'X-RateLimit-Remaining': String(opts.max - 1),
        'X-RateLimit-Reset':     String(now + opts.windowMs),
      },
    }
  }

  entry.count++

  const remaining = Math.max(0, opts.max - entry.count)
  const secs      = Math.ceil((entry.resetAt - now) / 1000)

  if (entry.count > opts.max) {
    return {
      success: false,
      error:   `Çok fazla istek. Lütfen ${secs} saniye sonra tekrar deneyin.`,
      headers: {
        'X-RateLimit-Limit':     String(opts.max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset':     String(entry.resetAt),
        'Retry-After':           String(secs),
      },
    }
  }

  return {
    success: true,
    headers: {
      'X-RateLimit-Limit':     String(opts.max),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset':     String(entry.resetAt),
    },
  }
}

// Hazır preset'ler
export const RATE_PRESETS = {
  appointment:      { max: 5,  windowMs: 15 * 60_000, prefix: 'rl:appt:'     },
  testResponse:     { max: 20, windowMs: 60 * 60_000, prefix: 'rl:test:'     },
  homeworkResponse: { max: 15, windowMs: 60 * 60_000, prefix: 'rl:hw:'       },
  financeExport:    { max: 30, windowMs: 60 * 60_000, prefix: 'rl:export:'   },
  busySlots:        { max: 30, windowMs: 60_000,       prefix: 'rl:busy:'     },
  contact:          { max: 3,  windowMs: 60 * 60_000, prefix: 'rl:contact:' },
} as const
