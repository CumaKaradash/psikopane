// app/not-found.tsx — Global 404

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function GlobalNotFound() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <p className="font-serif text-8xl text-sage/30 leading-none mb-4 select-none">
          404
        </p>
        <h1 className="font-serif text-2xl text-charcoal mb-2">Sayfa Bulunamadı</h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary justify-center py-3 flex items-center gap-2">
            <Home size={15} /> Ana Sayfa
          </Link>
          <Link href="/auth" className="btn-outline justify-center py-3 flex items-center gap-2">
            <ArrowLeft size={15} /> Giriş Yap
          </Link>
        </div>
      </div>
    </main>
  )
}
