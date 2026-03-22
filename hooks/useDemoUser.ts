// hooks/useDemoUser.ts
//
// Kullanımı:
//   const { isDemoUser, isLoading } = useDemoUser()
//
// Supabase session'ını dinler; kullanıcı oturumu değiştiğinde (giriş/çıkış)
// otomatik olarak güncellenir. SSR-safe: sunucu tarafında isLoading=true döner.

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

const DEMO_EMAIL = 'demo@psikopanel.com'

export interface UseDemoUserReturn {
  /** Giriş yapan kullanıcı demo hesabı ise true */
  isDemoUser: boolean
  /** Session ilk yüklenirken true; tamamlandıktan sonra false */
  isLoading:  boolean
  /** Oturumu başlatmış kullanıcının e-postası (null = oturum yok) */
  userEmail:  string | null
}

export function useDemoUser(): UseDemoUserReturn {
  const [session,   setSession]   = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // İlk yüklemede mevcut session'ı al
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    // Auth değişikliklerini dinle (giriş / çıkış / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const userEmail  = session?.user?.email ?? null
  const isDemoUser = !isLoading && userEmail === DEMO_EMAIL

  return { isDemoUser, isLoading, userEmail }
}
