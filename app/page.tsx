'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShieldCheck, HeartHandshake, Users } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Kullanıcı giriş yapmışsa panele yönlendir
        router.push('/panel')
      } else {
        // Giriş yapmamışsa yeni birleşik auth sayfasına yönlendir
        router.push('/auth')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-sage-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sage-600 rounded-2xl mb-4">
            <HeartHandshake className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-sage-900 mb-2">PsikoPanel</h1>
          <p className="text-sage-600">Klinik Yönetim Platformu</p>
        </div>

        {/* Loading ve Bilgi Kartı */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <Loader2 className="w-8 h-8 text-sage-600 animate-spin" />
          </div>
          
          <h2 className="text-lg font-semibold text-sage-900 mb-3">Yönlendiriliyorsunuz...</h2>
          
          <div className="space-y-4 text-sage-600 text-sm">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Güvenli giriş kontrolü yapılıyor</span>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Hesabınız doğrulanıyor</span>
            </div>
          </div>

          {/* Özellik Vurgusu */}
          <div className="mt-6 pt-6 border-t border-sage-100">
            <p className="text-xs text-sage-500">
              Psikologlar için tasarlanmış klinik yönetim platformuna hoş geldiniz
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-sage-500">
            © 2024 PsikoPanel • Tüm hakları saklıdır
          </p>
        </div>
      </div>
    </div>
  )
}
