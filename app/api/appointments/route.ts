import type { SupabaseClient } from '@supabase/supabase-js'
// app/api/appointments/route.ts
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, appointmentRateLimit, RATE_OPTS } from '@/lib/upstash-rate-limit'

// ── E-posta gönderici (Resend) ────────────────────────────────────────────────
async function sendAppointmentNotification(opts: {
  to:          string          // psikolog e-postası
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
  if (!key) return   // RESEND tanımlı değilse sessizce atla

  const dateStr = opts.startsAt
    ? new Date(opts.startsAt).toLocaleString('tr-TR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
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
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#5a7a6a,#2c2c2c);padding:32px 28px;text-align:center;">
      <p style="margin:0 0 8px;color:rgba(255,255,255,.6);font-size:12px;letter-spacing:.05em;text-transform:uppercase;">PsikoPanel Bildirimi</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Yeni Randevu Talebi</h1>
    </div>
    <!-- Merhaba -->
    <div style="padding:28px 28px 0;">
      <p style="margin:0 0 20px;color:#5a5a5a;font-size:14px;line-height:1.6;">
        Merhaba <strong>${opts.psychName}</strong>,<br>
        Aşağıda detaylarını görebileceğiniz yeni bir randevu talebi oluşturuldu.
      </p>
      <!-- Danışan kartı -->
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
      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${opts.appUrl}/panel/calendar"
          style="display:inline-block;background:#5a7a6a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
          Panelde İncele →
        </a>
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:0 28px 24px;text-align:center;border-top:1px solid #e2ddd6;margin-top:8px;padding-top:16px;">
      <p style="margin:0;font-size:11px;color:#9a9a9a;">
        Bu e-postayı PsikoPanel üzerinden aldınız.
      </p>
    </div>
  </div>
</body>
</html>
      `,
    }),
  }).catch(() => {/* e-posta başarısız olsa da randevu kaydedilmeli */})
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = supabase
    .from('appointments')
    .select('*, client:clients(full_name, phone)')
    .eq('psychologist_id', user.id)
    .order('starts_at')

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
    notify_consent, push_subscription,
  } = body

  // ── Panel tarafı ekleme ───────────────────────────────────────────────────
  if (_panel_add) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!guest_name) return NextResponse.json({ error: 'Danışan adı zorunlu' }, { status: 400 })
    if (!starts_at)  return NextResponse.json({ error: 'Tarih zorunlu' }, { status: 400 })

    // Çifte randevu kontrolü (panel tarafı)
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
  const rl = await checkRateLimit(req, appointmentRateLimit, RATE_OPTS.appointment)
  if (!rl.success)
    return NextResponse.json({ error: rl.error }, { status: 429, headers: rl.headers })

  if (!bodyPsychologistId || !guest_name || !guest_phone)
    return NextResponse.json({ error: 'Zorunlu alanlar eksik (psikolog, ad, telefon)' }, { status: 400 })

  if (!guest_email)
    return NextResponse.json({ error: 'E-posta zorunludur' }, { status: 400 })

  // Çifte randevu kontrolü (public booking)
  // starts_at yoksa tarih seçilmemiş demek → çakışma kontrolü atlanır
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

  let parsedPush: object | null = null
  if (push_subscription) {
    try { parsedPush = JSON.parse(push_subscription) } catch { /* geçersiz */ }
  }

  const supabase = await createServiceClient()

  // Psikolog profilini al (e-posta + isim için)
  const { data: psychProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', bodyPsychologistId)
    .single()

  // Randevuyu kaydet
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
      push_subscription: parsedPush,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Psikologu e-posta ile bildir (fire-and-forget) ───────────────────────
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
    }) // await yok — yanıtı bloklamaz
  }

  const res = NextResponse.json(data, { status: 201 })
  Object.entries(rl.headers).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, status, notes, price } = body
  if (!id) return NextResponse.json({ error: 'ID zorunlu' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (notes  !== undefined) updates.notes  = notes
  if (price  !== undefined) updates.price  = price

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .eq('psychologist_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
// istek süresi (durationMin) dikkate alınarak ±(dur/2) dakikalık pencere kontrol edilir.
// Örn: 50 dk'lık seans → ±25 dk = 09:00 randevusu için 08:35-09:25 arası dolu sayılır.
async function checkConflict(
  supabase: SupabaseClient,
  psychologistId: string,
  startsAt: string,
  durationMin: number
): Promise<boolean> {
  const requestedStart = new Date(startsAt).getTime()
  const halfDur        = (durationMin / 2) * 60 * 1000   // ms

  const windowStart = new Date(requestedStart - halfDur).toISOString()
  const windowEnd   = new Date(requestedStart + halfDur).toISOString()

  const { count } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('psychologist_id', psychologistId)
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', windowStart)
    .lte('starts_at', windowEnd)

  return (count ?? 0) > 0
}
