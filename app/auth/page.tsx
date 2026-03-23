'use client'
// app/auth/page.tsx - Birleşik Auth Sayfası

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2, User, Mail, Lock } from 'lucide-react'

type TabType = 'login' | 'register'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<TabType>('login')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  const router = useRouter()
  const supabase = createClient()

  // ── Login Fonksiyonu ─────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password
    })

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'E-posta veya şifre hatalı'
          : error.message
      )
      setLoading(false)
      return
    }

    toast.success('Giriş başarılı!')
    router.refresh()
    router.push('/panel')
  }

  // ── Register Fonksiyonu ───────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Şifreler eşleşmiyor')
      return
    }

    if (registerForm.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
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

  // Email doğrulama sonrası ekran
  if (done) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="font-serif text-2xl mb-2">E-postanızı Doğrulayın</h1>
          <p className="text-sm text-muted leading-relaxed mb-6">
            <strong>{registerForm.email}</strong> adresine doğrulama bağlantısı gönderdik.
            Bağlantıya tıkladıktan sonra giriş yapıp profilinizi tamamlayabilirsiniz.
          </p>
          <button
            onClick={() => setDone(false)}
            className="btn-primary justify-center w-full py-3"
          >
            Giriş Sayfasına Geri Dön →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sage-600 rounded-2xl mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl text-charcoal">PsikoPanel</h1>
          <p className="text-sm text-muted mt-1">Klinik Yönetim Platformu</p>
        </div>

        <div className="card p-8">

          {/* ── Sekmeler ── */}
          <div className="flex mb-6 bg-sage-50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-sage-700 shadow-sm'
                  : 'text-sage-500 hover:text-sage-700'
              }`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-sage-700 shadow-sm'
                  : 'text-sage-500 hover:text-sage-700'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          {/* ── Form İçeriği ── */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Mail size={14} />
                  E-posta
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="email@ornek.com"
                  value={loginForm.email}
                  onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Lock size={14} />
                  Şifre
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 mt-2
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Giriş yapılıyor…
                  </span>
                ) : 'Giriş Yap'}
              </button>
            </form>

          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Mail size={14} />
                  E-posta *
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="email@ornek.com"
                  value={registerForm.email}
                  onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Lock size={14} />
                  Şifre *
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="En az 6 karakter"
                  value={registerForm.password}
                  onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Lock size={14} />
                  Şifre Tekrar *
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Şifrenizi tekrar girin"
                  value={registerForm.confirmPassword}
                  onChange={e => setRegisterForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 mt-2
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Hesap oluşturuluyor…
                  </span>
                ) : 'Devam Et →'}
              </button>
            </form>
          )}

          {/* ── Alt Bilgi ── */}
          <div className="text-center text-sm text-muted mt-5">
            {activeTab === 'login' ? (
              <span>
                Hesabınız yok mu?{' '}
                <button
                  onClick={() => setActiveTab('register')}
                  className="text-sage hover:underline font-medium"
                >
                  Kayıt Ol
                </button>
              </span>
            ) : (
              <span>
                Hesabınız var mı?{' '}
                <button
                  onClick={() => setActiveTab('login')}
                  className="text-sage hover:underline font-medium"
                >
                  Giriş Yap
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-sage-500">
            © 2024 PsikoPanel • Tüm hakları saklıdır
          </p>
        </div>
      </div>
    </main>
  )
}
