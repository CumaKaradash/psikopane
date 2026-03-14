// app/[slug]/not-found.tsx
// [slug] segmenti altında notFound() çağrıldığında gösterilir

import Link from 'next/link'
import { SearchX, ArrowLeft, Home } from 'lucide-react'

export default function SlugNotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sage-pale via-cream to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {/* İkon */}
        <div className="w-20 h-20 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center mx-auto mb-6">
          <SearchX size={36} className="text-muted opacity-50" />
        </div>

        {/* Başlık */}
        <h1 className="font-serif text-3xl text-charcoal mb-3">
          Sayfa Bulunamadı
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-8">
          Aradığınız psikolog profili veya klinik mevcut değil ya da
          adres değiştirilmiş olabilir.
        </p>

        {/* Öneriler */}
        <div className="card p-5 text-left mb-6">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
            Ne yapabilirsiniz?
          </p>
          <ul className="space-y-2 text-sm text-charcoal">
            {[
              "URL'i doğru yazdığınızdan emin olun.",
              "Psikologun size verdiği bağlantıyı tekrar kontrol edin.",
              "Psikolog profilini yeniden oluşturmuş veya URL'i değiştirmiş olabilir.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-sage font-bold mt-0.5 flex-shrink-0">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Butonlar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/"
            className="btn-primary flex-1 justify-center py-3 flex items-center gap-2">
            <Home size={15} />
            Ana Sayfaya Dön
          </Link>
          <button onClick={() => history.back()}
            className="btn-outline flex-1 justify-center py-3 flex items-center gap-2">
            <ArrowLeft size={15} />
            Geri Git
          </button>
        </div>

        <p className="text-xs text-muted mt-6 opacity-50">Powered by PsikoPanel</p>
      </div>
    </main>
  )
}
