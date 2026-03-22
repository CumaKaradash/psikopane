// app/auth/layout.tsx — Auth sayfaları için metadata

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Giriş Yap | PsikoPanel',
  description: 'PsikoPanel psikolog paneline giriş yapın.',
  robots: 'noindex, nofollow',  // auth sayfaları arama motoruna indexlenmesin
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
