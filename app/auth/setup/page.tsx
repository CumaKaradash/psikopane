'use client'
// app/auth/setup/page.tsx
// Trigger geçici profil oluşturdu — burada full_name, slug, title, phone güncelleniyor.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { toSlug } from '@/lib/utils'

export default function SetupPage() {
  const [form, setForm] = useState({
    full_name: '', title: 'Uzman Klinik Psikolog', slug: '', phone: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.slug.trim()) {
      toast.error('Ad Soyad ve URL zorunlu')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Oturum bulunamadı, tekrar giriş yapın')
        router.push('/auth')
        return
      }

      // Trigger profil oluşturduysa UPDATE, oluşturmadıysa INSERT
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      const profileData = {
        full_name: form.full_name.trim(),
        title:     form.title.trim() || 'Psikolog',
        slug:      form.slug.trim(),
        phone:     form.phone.trim() || null,
        email:     user.email,
      }

      let error
      if (existing) {
        ;({ error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id))
      } else {
        ;({ error } = await supabase
          .from('profiles')
          .insert({ id: user.id, ...profileData }))
      }

      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          toast.error('Bu URL zaten kullanılıyor, başka bir tane deneyin')
        } else {
          toast.error(error.message)
        }
        setLoading(false)
        return
      }

      toast.success('Profil oluşturuldu!')
      router.refresh()
      router.push('/panel')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bir hata oluştu')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-charcoal">PsikoPanel</h1>
          <p className="text-sm text-muted mt-1">Profilinizi tamamlayın</p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Ad Soyad *</label>
              <input className="input" placeholder="Ayşe Yılmaz" required
                value={form.full_name}
                onChange={e => { set('full_name', e.target.value); set('slug', toSlug(e.target.value)) }} />
            </div>
            <div>
              <label className="label">Unvan</label>
              <input className="input" placeholder="Uzman Klinik Psikolog"
                value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="label">Randevu URL *</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted whitespace-nowrap">site.com/</span>
                <input className="input font-mono" placeholder="ayse-yilmaz" required
                  value={form.slug} onChange={e => set('slug', toSlug(e.target.value))} />
              </div>
              <p className="text-xs text-muted mt-1">
                Danışanlarınızın randevu alacağı sayfa adresi
              </p>
            </div>
            <div>
              <label className="label">Telefon</label>
              <input className="input" placeholder="05XX XXX XX XX"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-60">
              {loading ? 'Kaydediliyor…' : 'Panele Geç →'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
