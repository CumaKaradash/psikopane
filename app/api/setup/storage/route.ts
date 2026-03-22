// app/api/setup/storage/route.ts
// Storage bucket + RLS policy'leri otomatik oluşturur
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'psychologist-documents'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({
        ok: false,
        sql_required: true,
        error: 'SUPABASE_SERVICE_ROLE_KEY eksik. Supabase SQL Editor\'da 003_storage.sql dosyasını çalıştırın.',
      }, { status: 500 })
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: buckets, error: listErr } = await admin.storage.listBuckets()
    if (listErr) return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 })

    const exists = buckets?.some(b => b.name === BUCKET)

    if (!exists) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: [
          'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
          'application/pdf','application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain','text/csv',
          'audio/mpeg','audio/wav','audio/ogg',
          'video/mp4','video/quicktime','video/webm',
        ],
      })
      if (createErr) return NextResponse.json({ ok: false, error: createErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, created: !exists })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Bilinmeyen hata' },
      { status: 500 }
    )
  }
}
