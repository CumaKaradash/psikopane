import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_PRESETS } from '@/lib/rate-limit'

// ── Geri bildirim e-posta gönderici (Resend) ───────────────────────────────────
async function sendFeedbackEmail(opts: {
  type: string
  subject: string
  message: string
  email?: string
}) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'bildirim@psikopanel.tr'
  const to = 'cumakaradash@gmail.com'
  
  if (!key) {
    console.error('RESEND_API_KEY not configured')
    return false
  }

  const typeLabels = {
    bug: 'Hata Bildirimi',
    feature: 'Özellik İsteği',
    general: 'Genel Görüş',
    other: 'Diğer'
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${key}` 
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `📝 PsikoPanel Geri Bildirim: ${typeLabels[opts.type as keyof typeof typeLabels] || opts.type}`,
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background:#faf8f4; font-family:system-ui, sans-serif;">
  <div style="max-width:600px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#5a7a6a,#2c2c2c); padding:32px 28px; text-align:center;">
      <p style="margin:0 0 8px; color:rgba(255,255,255,.6); font-size:12px; letter-spacing:.05em; text-transform:uppercase;">PsikoPanel</p>
      <h1 style="margin:0; color:#fff; font-size:22px; font-weight:700;">Yeni Geri Bildirim</h1>
    </div>
    
    <div style="padding:28px 28px 0;">
      <div style="background:#faf8f4; border-radius:12px; padding:20px; margin-bottom:20px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0; font-size:11px; font-weight:700; color:#7a7a7a; text-transform:uppercase; letter-spacing:.05em; width:120px;">Tür</td>
            <td style="padding:6px 0; font-size:14px; font-weight:600; color:#2c2c2c;">
              <span style="background:#5a7a6a; color:#fff; padding:4px 12px; border-radius:20px; font-size:12px;">
                ${typeLabels[opts.type as keyof typeof typeLabels] || opts.type}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0; font-size:11px; font-weight:700; color:#7a7a7a; text-transform:uppercase; letter-spacing:.05em;">Konu</td>
            <td style="padding:6px 0; font-size:14px; font-weight:600; color:#2c2c2c;">${opts.subject}</td>
          </tr>
          ${opts.email ? `
          <tr>
            <td style="padding:6px 0; font-size:11px; font-weight:700; color:#7a7a7a; text-transform:uppercase; letter-spacing:.05em;">E-posta</td>
            <td style="padding:6px 0; font-size:14px; color:#2c2c2c;">${opts.email}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:6px 0; font-size:11px; font-weight:700; color:#7a7a7a; text-transform:uppercase; letter-spacing:.05em;">Tarih</td>
            <td style="padding:6px 0; font-size:14px; color:#2c2c2c;">${new Date().toLocaleString('tr-TR', {
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 8px; font-size:11px; font-weight:700; color:#7a7a7a; text-transform:uppercase; letter-spacing:.05em;">Mesaj</p>
        <div style="background:#f8f8f8; border-left:4px solid #5a7a6a; padding:16px; border-radius:0 8px 8px 0;">
          <p style="margin:0; color:#2c2c2c; line-height:1.6; white-space:pre-wrap;">${opts.message}</p>
        </div>
      </div>
    </div>
    
    <div style="padding:0 28px 24px; text-align:center; border-top:1px solid #e2ddd6; margin-top:8px; padding-top:16px;">
      <p style="margin:0; font-size:11px; color:#9a9a9a;">Bu e-posta PsikoPanel geri bildirim formu üzerinden gönderildi.</p>
    </div>
  </div>
</body>
</html>
        `,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending feedback email:', error)
    return false
  }
}

export async function POST(req: Request) {
  try {
    console.log('Feedback API called')
    
    // Rate limiting
    const rl = checkRateLimit(req, RATE_PRESETS.contact)
    if (!rl.success) {
      console.log('Rate limit exceeded')
      return NextResponse.json({ error: rl.error }, { status: 429, headers: rl.headers })
    }

    const body = await req.json()
    console.log('Request body:', body)
    
    const { type, subject, message, email } = body

    // Validation
    if (!type || !subject || !message) {
      console.log('Validation failed: missing fields')
      return NextResponse.json(
        { error: 'Tür, konu ve mesaj alanları zorunludur' }, 
        { status: 400 }
      )
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: 'Konu en fazla 200 karakter olabilir' }, 
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Mesaj en fazla 2000 karakter olabilir' }, 
        { status: 400 }
      )
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta adresi' }, 
        { status: 400 }
      )
    }

    console.log('Validation passed, sending email...')
    
    // Send email
    const emailSent = await sendFeedbackEmail({ type, subject, message, email })
    
    console.log('Email sent result:', emailSent)

    if (!emailSent) {
      console.log('Email sending failed')
      return NextResponse.json(
        { error: 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.' }, 
        { status: 500 }
      )
    }

    const response = NextResponse.json({ 
      success: true, 
      message: 'Geri bildiriminiz başarıyla gönderildi' 
    }, { status: 200 })

    // Add rate limit headers
    Object.entries(rl.headers).forEach(([k, v]) => response.headers.set(k, v))

    return response

  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' }, 
      { status: 500 }
    )
  }
}
