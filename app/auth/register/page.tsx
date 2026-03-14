'use client'
// app/auth/register/page.tsx
// Trigger otomatik profiles satırı oluşturur.
// Register sadece signUp yapar, profil bilgileri /auth/setup'ta tamamlanır.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Şifreler eşleşmiyor')
      return
    }
    if (form.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (error) throw error

      if (data.session) {
        // Email doğrulama kapalı — direkt setup'a yönlendir
        toast.success('Hesap oluşturuldu!')
        router.refresh()
        router.push('/auth/setup')
      } else {
        // Email doğrulama açık
        setDone(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu'
      toast.error(msg === 'User already registered' ? 'Bu e-posta zaten kayıtlı' : msg)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="font-serif text-2xl mb-2">E-postanızı Doğrulayın</h1>
          <p className="text-sm text-muted leading-relaxed mb-6">
            <strong>{form.email}</strong> adresine doğrulama bağlantısı gönderdik.
            Bağlantıya tıkladıktan sonra giriş yapıp profilinizi tamamlayabilirsiniz.
          </p>
          <Link href="/auth/login" className="btn-primary justify-center w-full py-3">
            Giriş Sayfasına Git →
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-charcoal">PsikoPanel</h1>
          <p className="text-sm text-muted mt-1">Yeni hesap oluştur</p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-posta *</label>
              <input className="input" type="email" placeholder="email@ornek.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="label">Şifre *</label>
              <input className="input" type="password" placeholder="En az 6 karakter"
                value={form.password} onChange={e => set('password', e.target.value)}
                required minLength={6} />
            </div>
            <div>
              <label className="label">Şifre Tekrar *</label>
              <input className="input" type="password" placeholder="Şifrenizi tekrar girin"
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                required minLength={6} />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-60">
              {loading ? 'Hesap oluşturuluyor…' : 'Devam Et →'}
            </button>
          </form>
          <p className="text-center text-sm text-muted mt-5">
            Hesabınız var mı?{' '}
            <Link href="/auth/login" className="text-sage hover:underline font-medium">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
