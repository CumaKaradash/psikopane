'use client'
// app/auth/login/page.tsx

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'E-posta veya şifre hatalı'
        : error.message)
      setLoading(false)
      return
    }
    toast.success('Giriş başarılı!')
    router.refresh()
    router.push('/panel')
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-charcoal">PsikoPanel</h1>
          <p className="text-sm text-muted mt-1">Psikolog girişi</p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">E-posta</label>
              <input className="input" type="email" placeholder="email@ornek.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Şifre</label>
              <input className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2 disabled:opacity-60">
              {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>
          <p className="text-center text-sm text-muted mt-5">
            Hesabınız yok mu?{' '}
            <Link href="/auth/register" className="text-sage hover:underline font-medium">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
