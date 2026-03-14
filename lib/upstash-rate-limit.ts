// lib/upstash-rate-limit.ts
// Production-ready rate limiting (Upstash Redis) + in-memory dev fallback

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── Upstash Redis (yalnızca env tanımlıysa başlat) ─────────────────────────
function makeRedis() {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return null
}

const redis = makeRedis()

// ─── Upstash Ratelimiters (production) ──────────────────────────────────────
export const appointmentRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ratelimit:appointment:',
    })
  : null

export const testResponseRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      analytics: true,
      prefix: 'ratelimit:test-response:',
    })
  : null

export const homeworkResponseRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, '1 h'),
      analytics: true,
      prefix: 'ratelimit:homework-response:',
    })
  : null

// ─── In-Memory fallback (development / Upstash yok) ─────────────────────────
interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>()

function memRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: max - 1, reset: now + windowMs }
  }

  entry.count++
  if (entry.count > max) {
    return { success: false, remaining: 0, reset: entry.resetAt }
  }
  return { success: true, remaining: max - entry.count, reset: entry.resetAt }
}

// ─── IP yardımcısı ───────────────────────────────────────────────────────────
function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ─── Genel checkRateLimit fonksiyonu ─────────────────────────────────────────
export async function checkRateLimit(
  req: Request,
  limiter: Ratelimit | null,
  opts: { max: number; windowMs: number; prefix: string }
): Promise<{ success: boolean; error?: string; headers: Record<string, string> }> {
  const ip = getIP(req)

  // Production: Upstash
  if (limiter) {
    const result = await limiter.limit(ip)
    return {
      success: result.success,
      error: result.success
        ? undefined
        : 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.',
      headers: {
        'X-RateLimit-Limit':     result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset':     result.reset.toString(),
      },
    }
  }

  // Development: in-memory
  const result = memRateLimit(`${opts.prefix}${ip}`, opts.max, opts.windowMs)
  const secs   = Math.ceil((result.reset - Date.now()) / 1000)
  return {
    success: result.success,
    error: result.success
      ? undefined
      : `Çok fazla istek. Lütfen ${secs} saniye sonra tekrar deneyin.`,
    headers: {
      'X-RateLimit-Limit':     opts.max.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset':     result.reset.toString(),
    },
  }
}

// ─── Hazır preset'ler ────────────────────────────────────────────────────────
export const RATE_OPTS = {
  appointment:       { max: 5,  windowMs: 15 * 60 * 1000, prefix: 'ratelimit:appointment:' },
  testResponse:      { max: 20, windowMs: 60 * 60 * 1000, prefix: 'ratelimit:test-response:' },
  homeworkResponse:  { max: 15, windowMs: 60 * 60 * 1000, prefix: 'ratelimit:homework-response:' },
} as const
