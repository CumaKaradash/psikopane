// app/api/cron/reminders/route.ts
// Yaklaşan randevular için e-posta hatırlatması
// Vercel Cron: her gün 06:00 UTC'de çalışır (vercel.json)
// Authorization: Bearer {CRON_SECRET}

import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'

async function sendReminderEmail(opts: {
  to:          string
  guestName:   string
  psychName:   string
  sessionType: string
  startsAt:    string
  appUrl:      string
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@psikopanel.tr'
  if (!resendKey) return false

  const date    = new Date(opts.startsAt)
  const dateStr = date.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from:    fromEmail,
      to:      [opts.to],
      subject: `⏰ Randevu Hatırlatması — ${dateStr} ${timeStr}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#faf8f4;border-radius:12px;">
          <h2 style="color:#2c2c2c;font-size:22px;margin-bottom:8px;">Merhaba ${opts.guestName} 👋</h2>
          <p style="color:#5a5a5a;margin-bottom:24px;">Yakında bir randevunuz var, hatırlatmak istedik!</p>
          <div style="background:#fff;border:1px solid #e2ddd6;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Psikolog</p>
            <p style="margin:0 0 16px;font-weight:600;color:#2c2c2c;">${opts.psychName}</p>
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Seans Türü</p>
            <p style="margin:0 0 16px;color:#2c2c2c;">${opts.sessionType}</p>
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Tarih & Saat</p>
            <p style="margin:0;font-weight:700;color:#5a7a6a;font-size:18px;">${dateStr} — ${timeStr}</p>
          </div>
          <p style="color:#9a9a9a;font-size:12px;text-align:center;">
            Bu e-postayı almak istemiyorsanız, gelecek randevularda bildirim onayını kaldırabilirsiniz.
          </p>
        </div>
      `,
    }),
  })
  return res.ok
}

export async function POST(req: Request) {
  // Güvenlik: Vercel Cron veya manuel tetikleme için secret kontrolü
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const now      = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60_000)

  // Yarın olan onaylı randevuları bul
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id, guest_name, guest_email, session_type, starts_at, notify_consent,
      psychologist:profiles!psychologist_id(full_name)
    `)
    .eq('status', 'confirmed')
    .eq('notify_consent', true)
    .gte('starts_at', tomorrow.toISOString().slice(0, 10) + 'T00:00:00')
    .lte('starts_at', tomorrow.toISOString().slice(0, 10) + 'T23:59:59')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://psikopanel.tr'
  let sent = 0

  for (const appt of appointments ?? []) {
    if (!appt.guest_email || !appt.guest_name) continue
    const psychName = (appt.psychologist as any)?.full_name ?? 'Psikologunuz'
    const ok = await sendReminderEmail({
      to:          appt.guest_email,
      guestName:   appt.guest_name,
      psychName,
      sessionType: appt.session_type,
      startsAt:    appt.starts_at,
      appUrl,
    })
    if (ok) sent++
  }

  return NextResponse.json({
    processed: (appointments ?? []).length,
    sent,
    timestamp: new Date().toISOString(),
  })
}
