import type { SupabaseClient } from '@supabase/supabase-js'
// app/api/appointments/route.ts
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_PRESETS } from '@/lib/rate-limit'
import { BookingSchema, PanelAppointmentSchema } from '@/lib/schemas'

// ── E-posta gönderici (Resend) ────────────────────────────────────────────────
async function sendAppointmentNotification(opts: {
  to:          string
  psychName:   string
  guestName:   string
  guestPhone:  string
  guestEmail:  string
  sessionType: string
  startsAt:    string | null
  appUrl:      string
}) {
  const key  = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'bildirim@psikopanel.tr'
  if (!key) return

  const dateStr = opts.startsAt
    ? new Date(opts.startsAt).toLocaleString('tr-TR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
      })
    : 'Belirtilmedi'

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      from,
      to:      [opts.to],
      subject: `🗓️ Yeni Randevu Talebi: ${opts.guestName}`,
      html: `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f4;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#5a7a6a,#2c2c2c);padding:32px 28px;text-align:center;">
      <p style="margin:0 0 8px;color:rgba(255,255,255,.6);font-size:12px;letter-spacing:.05em;text-transform:uppercase;">PsikoPanel Bildirimi</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Yeni Randevu Talebi</h1>
    </div>
    <div style="padding:28px 28px 0;">
      <p style="margin:0 0 20px;color:#5a5a5a;font-size:14px;line-height:1.6;">
        Merhaba <strong>${opts.psychName}</strong>,<br>
        Aşağıda detaylarını görebileceğiniz yeni bir randevu talebi oluşturuldu.
      </p>
      <div style="background:#faf8f4;border-radius:12px;padding:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:11px;font-weight:700;color:#7a7a7a;text-transform:uppercase;letter-spacing:.05em;width:120px;">Danışan</td>
            <td style="padding:6px 0;font-size:14px;font-weight:600;color:#2c2c2c;">${opts.guestName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:11px;font-weight:700;color:#7a7a7a;text-transform:uppercase;letter-spacing:.05em;">Telefon</td>
            <td style="padding:6px 0;font-size:14px;color:#2c2c2c;">${opts.guestPhone}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:11px;font-weight:700;color:#7a7a7a;text-transform:uppercase;letter-spacing:.05em;">E-posta</td>
            <td style="padding:6px 0;font-size:14px;color:#2c2c2c;">${opts.guestEmail || '—'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:11px;font-weight:700;color:#7a7a7a;text-transform:uppercase;letter-spacing:.05em;">Seans</td>
            <td style="padding:6px 0;font-size:14px;color:#2c2c2c;">${opts.sessionType}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:11px;font-weight:700;color:#7a7a7a;text-transform:uppercase;letter-spacing:.05em;">Tarih / Saat</td>
            <td style="padding:6px 0;font-size:14px;font-weight:700;color:#5a7a6a;">${dateStr}</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${opts.appUrl}/panel/calendar"
          style="display:inline-block;background:#5a7a6a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
          Panelde İncele →
        </a>
      </div>
    </div>
    <div style="padding:0 28px 24px;text-align:center;border-top:1px solid #e2ddd6;margin-top:8px;padding-top:16px;">
      <p style="margin:0;font-size:11px;color:#9a9a9a;">Bu e-postayı PsikoPanel üzerinden aldınız.</p>
    </div>
  </div>
</body>
</html>
      `,
    }),
  }).catch(() => {})
}

// ── ICS Takvim Dosyası Üretici ────────────────────────────────────────────────
function generateICS(opts: {
  summary:     string
  description: string
  location:    string
  dtStart:     Date
  durationMin: number
  uid:         string
}): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const dtEnd = new Date(opts.dtStart.getTime() + opts.durationMin * 60_000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PsikoPanel//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@psikopanel.tr`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.dtStart)}`,
    `DTEND:${fmt(dtEnd)}`,
    `SUMMARY:${opts.summary}`,
    `DESCRIPTION:${opts.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${opts.location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Randevu hatırlatması',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// ── Randevu onay e-postası (ICS ekli) ────────────────────────────────────────
async function sendConfirmationEmail(opts: {
  to:          string
  guestName:   string
  psychName:   string
  sessionType: string
  startsAt:    string
  durationMin: number
  appointmentId: string
  appUrl:      string
}) {
  const key  = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'bildirim@psikopanel.tr'
  if (!key) return

  const startDate = new Date(opts.startsAt)
  const dateStr   = startDate.toLocaleString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
  })

  const icsContent = generateICS({
    summary:     `${opts.sessionType} — ${opts.psychName}`,
    description: `Psikolog: ${opts.psychName}\nSeans: ${opts.sessionType}`,
    location:    opts.appUrl,
    dtStart:     startDate,
    durationMin: opts.durationMin,
    uid:         opts.appointmentId,
  })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      from, to: [opts.to],
      subject: `✅ Randevunuz Onaylandı — ${dateStr}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#faf8f4;border-radius:12px;">
          <h2 style="color:#2c2c2c;margin-bottom:8px;">Merhaba ${opts.guestName} 👋</h2>
          <p style="color:#5a5a5a;margin-bottom:24px;">Randevunuz onaylandı!</p>
          <div style="background:#fff;border:1px solid #e2ddd6;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;">Psikolog</p>
            <p style="margin:0 0 16px;font-weight:600;color:#2c2c2c;">${opts.psychName}</p>
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;">Seans</p>
            <p style="margin:0 0 16px;color:#2c2c2c;">${opts.sessionType}</p>
            <p style="margin:0 0 8px;color:#7a7a7a;font-size:12px;text-transform:uppercase;">Tarih & Saat</p>
            <p style="margin:0;font-weight:700;color:#5a7a6a;font-size:18px;">${dateStr}</p>
          </div>
          <p style="color:#9a9a9a;font-size:12px;text-align:center;">Takvim daveti e-posta ekinde bulunmaktadır.</p>
        </div>
      `,
      attachments: [{
        filename: 'randevu.ics',
        content:  Buffer.from(icsContent).toString('base64'),
      }],
    }),
  }).catch(() => {})
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')
  const from   = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = supabase
    .from('appointments')
    .select(`
      *, 
      client:clients(id, full_name, phone, email),
      psychologist:profiles!psychologist_id(id, full_name, title, slug)
    `)

  // Eğer team_id varsa, o takıma ait tüm randevuları getir
  if (teamId) {
    // Takım üyelerinin randevularını getir
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('psychologist_id')
      .eq('team_id', teamId)
      .eq('status', 'accepted')
    
    const memberIds = teamMembers?.map(m => m.psychologist_id) || []
    query = query.in('psychologist_id', memberIds)
  } else {
    // Kişisel randevuları getir
    query = query.eq('psychologist_id', user.id)
  }

  if (from) query = query.gte('starts_at', from)
  if (to)   query = query.lte('starts_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json()
  const {
    psychologist_id: bodyPsychologistId,
    _panel_add,
    guest_name, guest_phone, guest_email, guest_note,
    session_type, starts_at, duration_min, notes,
    notify_consent,
  } = body

  // ── Panel tarafı ekleme ───────────────────────────────────────────────────
  if (_panel_add) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const panelParsed = PanelAppointmentSchema.safeParse(body)
    if (!panelParsed.success)
      return NextResponse.json({ error: panelParsed.error.issues[0]?.message ?? 'Geçersiz veri' }, { status: 400 })

    const panelConflict = await checkConflict(supabase, user.id, starts_at, duration_min ?? 50)
    if (panelConflict)
      return NextResponse.json(
        { error: 'Bu saat aralığı dolu. Lütfen başka bir saat seçin.' },
        { status: 409 }
      )

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        psychologist_id: user.id,
        guest_name,
        guest_phone:  guest_phone  ?? null,
        guest_email:  guest_email  ?? null,
        guest_note:   guest_note   ?? null,
        session_type: session_type || 'Bireysel Terapi',
        starts_at,
        duration_min: duration_min ?? 50,
        notes:        notes        ?? null,
        status:       'confirmed',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  // ── Public randevu talebi — rate limit ───────────────────────────────────
  const rl = checkRateLimit(req, RATE_PRESETS.appointment)
  if (!rl.success)
    return NextResponse.json({ error: rl.error }, { status: 429, headers: rl.headers })

  const bookingParsed = BookingSchema.safeParse(body)
  if (!bookingParsed.success)
    return NextResponse.json({ error: bookingParsed.error.issues[0]?.message ?? 'Geçersiz form verisi' }, { status: 400 })

  if (!bodyPsychologistId)
    return NextResponse.json({ error: 'Psikolog seçilmedi' }, { status: 400 })

  // Service client — hem conflict check hem insert için kullan
  // (public request'te anon client'ın RLS'i appointments'a INSERT yapmasını engeller)
  const supabase = await createServiceClient()

  // Çifte randevu kontrolü — service client ile yapılır
  if (starts_at) {
    const publicConflict = await checkConflict(
      supabase, bodyPsychologistId, starts_at, duration_min ?? 50
    )
    if (publicConflict)
      return NextResponse.json(
        { error: 'Bu saat aralığı maalesef dolu. Lütfen başka bir saat seçin.' },
        { status: 409 }
      )
  }

  // Psikolog profilini al (e-posta + isim için)
  const { data: psychProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', bodyPsychologistId)
    .single()

  // Randevuyu kaydet — status: 'pending' (onay bekliyor)
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      psychologist_id:  bodyPsychologistId,
      guest_name,
      guest_phone,
      guest_email,
      guest_note:        guest_note       || null,
      session_type:      session_type     || 'Bireysel Terapi',
      starts_at:         starts_at        || new Date().toISOString(),
      duration_min:      duration_min     ?? 50,
      status:            'pending',
      notify_consent:    notify_consent   ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Psikologu e-posta ile bildir (fire-and-forget)
  if (psychProfile?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://psikopanel.tr'
    sendAppointmentNotification({
      to:          psychProfile.email,
      psychName:   psychProfile.full_name,
      guestName:   guest_name,
      guestPhone:  guest_phone,
      guestEmail:  guest_email,
      sessionType: session_type || 'Bireysel Terapi',
      startsAt:    starts_at    || null,
      appUrl,
    })
  }

  const res = NextResponse.json(data, { status: 201 })
  Object.entries(rl.headers).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

// ── İptal bildirimi ───────────────────────────────────────────────────────────
async function sendCancellationEmail(opts: {
  to:          string
  guestName:   string
  psychName:   string
  sessionType: string
  startsAt:    string
  appUrl:      string
}) {
  const key  = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'bildirim@psikopanel.tr'
  if (!key || !opts.to) return

  const dateStr = new Date(opts.startsAt).toLocaleString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
  })

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      from,
      to:      [opts.to],
      subject: `❌ Randevunuz İptal Edildi`,
      html: `
<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#faf8f4;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#c0392b,#7f2020);padding:32px 28px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Randevu İptal Edildi</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#5a5a5a;font-size:14px;line-height:1.6;">
        Merhaba <strong>${opts.guestName}</strong>,<br>
        Aşağıdaki randevunuz <strong>${opts.psychName}</strong> tarafından iptal edilmiştir.
      </p>
      <div style="background:#faf8f4;border-radius:12px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#7a7a7a;text-transform:uppercase;width:120px;">Seans</td>
              <td style="padding:6px 0;font-size:14px;color:#2c2c2c;">${opts.sessionType}</td></tr>
          <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#7a7a7a;text-transform:uppercase;">Tarih</td>
              <td style="padding:6px 0;font-size:14px;font-weight:700;color:#c0392b;">${dateStr}</td></tr>
        </table>
      </div>
      <p style="color:#5a5a5a;font-size:13px;">Yeni randevu almak için profilimizi ziyaret edebilirsiniz.</p>
    </div>
  </div>
</body></html>`,
    }),
  }).catch(() => {})
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, status, notes, price, client_id } = body
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (status    !== undefined) updates.status    = status
  if (notes     !== undefined) updates.notes     = notes
  if (price     !== undefined) updates.price     = price
  if (client_id !== undefined) updates.client_id  = client_id

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })

  // Randevunun mevcut durumunu al (bildirim ve otomatik kayıt için)
  const { data: current } = await supabase
    .from('appointments')
    .select('status, price, guest_email, guest_name, session_type, starts_at, psychologist_id')
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .single()

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://psikopanel.tr'

  // ── Durum değişikliğine göre yan etkiler ─────────────────────────────────
  if (current && status && status !== current.status) {

    // Onaylandı → danışana takvim davetli e-posta gönder
    if (status === 'confirmed' && current.guest_email && current.status !== 'confirmed') {
      const { data: psychProfile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single()
      sendConfirmationEmail({
        to:            current.guest_email,
        guestName:     current.guest_name ?? 'Danışan',
        psychName:     psychProfile?.full_name ?? '',
        sessionType:   current.session_type,
        startsAt:      current.starts_at,
        durationMin:   50,
        appointmentId: id,
        appUrl,
      })
    }

    // İptal edildi → danışana e-posta bildir
    if (status === 'cancelled' && current.guest_email) {
      const { data: psychProfile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single()
      sendCancellationEmail({
        to:          current.guest_email,
        guestName:   current.guest_name ?? 'Danışan',
        psychName:   psychProfile?.full_name ?? '',
        sessionType: current.session_type,
        startsAt:    current.starts_at,
        appUrl,
      })
    }

    // Tamamlandı → price varsa otomatik gelir kaydı ekle
    if (status === 'completed') {
      const finalPrice = price ?? current.price
      if (finalPrice && finalPrice > 0) {
        const entryDate = current.starts_at
          ? new Date(current.starts_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
        await supabase.from('finance_entries').insert({
          psychologist_id: user.id,
          type:            'income',
          amount:          finalPrice,
          description:     `Seans — ${current.guest_name ?? 'Danışan'} (${current.session_type})`,
          appointment_id:  id,
          entry_date:      entryDate,
        })
      }
    }
  }

  return NextResponse.json(data)
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('psychologist_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// ── Çifte randevu kontrolü ────────────────────────────────────────────────────
// Yeni randevu [newStart, newEnd) ile mevcut randevuların [start, end) aralığını karşılaştırır.
// Kesişim varsa → çakışma var demek.
// Çakışma koşulu: mevcut.start < yeni.end AND mevcut.end > yeni.start
async function checkConflict(
  supabase: SupabaseClient,
  psychologistId: string,
  startsAt: string,
  durationMin: number
): Promise<boolean> {
  const newStart = new Date(startsAt)
  const newEnd   = new Date(newStart.getTime() + durationMin * 60 * 1000)

  // Mevcut randevuları geniş pencerede çek (yeni seansın başından 24 saat öncesine kadar)
  // Sonra uygulama tarafında gerçek çakışma kontrolü yap
  const windowFrom = new Date(newStart.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const windowTo   = newEnd.toISOString()

  const { data: existing } = await supabase
    .from('appointments')
    .select('starts_at, duration_min')
    .eq('psychologist_id', psychologistId)
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', windowFrom)
    .lte('starts_at', windowTo)

  if (!existing || existing.length === 0) return false

  // Gerçek aralık kesişimi kontrolü
  for (const appt of existing) {
    const existStart = new Date(appt.starts_at)
    const existEnd   = new Date(existStart.getTime() + (appt.duration_min ?? 50) * 60 * 1000)
    // Kesişim: existStart < newEnd AND existEnd > newStart
    if (existStart < newEnd && existEnd > newStart) {
      return true
    }
  }

  return false
}
