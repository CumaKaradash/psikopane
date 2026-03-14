// app/api/cron/reminders/route.ts
// Yaklaşan randevular için e-posta (Resend) + Web Push bildirimi
// Vercel Cron: her gün sabah 08:00'de çalıştır
// vercel.json: { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 6 * * *" }] }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// ── Servis kurulumu ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Web Push VAPID yapılandırması
const vapidConfigured =
  process.env.VAPID_PRIVATE_KEY &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_SUBJECT

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

// ── Resend e-posta gönderici ──────────────────────────────────────────────────
async function sendReminderEmail(opts: {
  to:             string
  guestName:      string
  psychName:      string
  sessionType:    string
  startsAt:       string
  appUrl:         string
}) {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@psikopanel.tr'
  if (!resendKey) return false

  const date = new Date(opts.startsAt)
  const dateStr = date.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from:    fromEmail,
      to:      [opts.to],
      subject: `⏰ Randevu Hatırlatması — ${dateStr} ${timeStr}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#faf8f4;border-radius:12px;">
          <h2 style="color:#2c2c2c;font-size:22px;margin-bottom:8px;">Merhaba ${opts.guestName} 👋</h2>
          <p style="color:#5a5a5a;margin-bottom:24px;">Yarın veya yakında bir randevunuz var, hatırlatmak istedik!</p>
          <div style="background:#fff;border:1px solid #e2ddd6;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Psikolog</p>
            <p style="margin:0 0 16px;font-weight:600;color:#2c2c2c;">${opts.psychName}</p>
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Seans Türü</p>
            <p style="margin:0 0 16px;color:#2c2c2c;">${opts.sessionType}</p>
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Tarih & Saat</p>
            <p style="margin:0;font-weight:700;color:#5a7a6a;font-size:18px;">${dateStr} — ${timeStr}</p>
          </div>
          <p style="color:#9a9a9a;font-size:12px;text-align:center;">Bu e-postayı almak istemiyorsanız, gelecek randevularda bildirim onayını kaldırabilirsiniz.</p>
        </div>
      `,
    }),
  })
  return res.ok
}

// ── Web Push gönderici ────────────────────────────────────────────────────────
async function sendPushNotification(opts: {
  subscription: object
  guestName:    string
  psychName:    string
  startsAt:     string
}) {
  if (!vapidConfigured) return false
  try {
    const date = new Date(opts.startsAt)
    const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    await webpush.sendNotification(
      opts.subscription as webpush.PushSubscription,
      JSON.stringify({
        title: '⏰ Randevu Hatırlatması',
        body:  `${opts.psychName} ile saat ${timeStr} randevunuz yaklaşıyor.`,
        url:   '/',
      })
    )
    return true
  } catch {
    return false
  }
}

// ── GET handler — Vercel Cron bu endpoint'i çağırır ─────────────────────────
export async function GET(req: Request) {
  // Güvenlik: Vercel Cron secret header
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://psikopanel.tr'

  // Yarın saat aralığı: şimdiden 20-28 saat sonrası
  const now    = new Date()
  const from   = new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString()
  const to     = new Date(now.getTime() + 28 * 60 * 60 * 1000).toISOString()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id, starts_at, session_type,
      guest_name, guest_email, notify_consent, push_subscription,
      psychologist:profiles!psychologist_id (full_name)
    `)
    .eq('status', 'confirmed')
    .eq('notify_consent', true)
    .gte('starts_at', from)
    .lte('starts_at', to)

  if (error) {
    console.error('Cron: randevu sorgusu hatası', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = { total: 0, emailSent: 0, pushSent: 0, errors: 0 }

  for (const appt of appointments ?? []) {
    results.total++
    const psychName = (appt.psychologist as any)?.full_name ?? 'Psikologunuz'

    // E-posta
    if (appt.guest_email) {
      const ok = await sendReminderEmail({
        to:          appt.guest_email,
        guestName:   appt.guest_name ?? 'Danışan',
        psychName,
        sessionType: appt.session_type,
        startsAt:    appt.starts_at,
        appUrl,
      })
      if (ok) results.emailSent++
      else    results.errors++
    }

    // Push
    if (appt.push_subscription) {
      const ok = await sendPushNotification({
        subscription: appt.push_subscription,
        guestName:    appt.guest_name ?? 'Danışan',
        psychName,
        startsAt:     appt.starts_at,
      })
      if (ok) results.pushSent++
      else    results.errors++
    }
  }
  return NextResponse.json({ success: true, ...results })
}
