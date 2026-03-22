'use client'
// components/panel/DemoPaywallModal.tsx

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Lock, ArrowRight, Sparkles } from 'lucide-react'

interface DemoPaywallModalProps {
  isOpen:  boolean
  onClose: () => void
}

const FEATURES = [
  'Sınırsız danışan kaydı',
  'Randevu & takvim yönetimi',
  'Ödev & test gönderimi',
  'Gelir takibi ve raporlar',
]

export default function DemoPaywallModal({ isOpen, onClose }: DemoPaywallModalProps) {
  const router     = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Klavye desteği: ESC ile kapat
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // Açıkken body scroll'u kilitle
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  function handleUpgrade() {
    router.push('/auth')
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4
                 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full sm:max-w-md bg-white
                   rounded-t-2xl sm:rounded-2xl shadow-lg
                   overflow-hidden
                   animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        {/* ── Üst Gradient Şerit ── */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sage via-sage-l to-accent" />

        {/* ── İçerik ── */}
        <div className="p-6 sm:p-7">

          {/* Kapat butonu */}
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted
                       hover:text-charcoal hover:bg-cream transition-colors"
          >
            <X size={17} />
          </button>

          {/* İkon + Başlık */}
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200
                            flex items-center justify-center">
              <Lock size={20} className="text-amber-500" />
            </div>
            <div>
              <h2
                id="paywall-title"
                className="text-base font-bold text-charcoal leading-snug"
              >
                Demo Modu Kısıtlaması
              </h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                Şu anda demo ortamındasınız ve veritabanına yeni kayıt ekleyemez
                veya mevcut verileri değiştiremezsiniz.
              </p>
            </div>
          </div>

          {/* Açıklama Kutusu */}
          <div className="rounded-xl bg-[#f0f6f2] border border-sage-l px-4 py-3.5 mb-5">
            <p className="text-sm text-sage-d leading-relaxed">
              Kendi kliniğinizi yönetmek ve tüm özellikleri kullanmak için
              hemen <span className="font-semibold">ücretsiz deneme sürümünüzü</span> başlatın.
              Kredi kartı gerekmez.
            </p>
          </div>

          {/* Özellik listesi */}
          <ul className="space-y-1.5 mb-6">
            {FEATURES.map(feat => (
              <li key={feat} className="flex items-center gap-2.5 text-sm text-charcoal">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-sage/15 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage block" />
                </span>
                {feat}
              </li>
            ))}
          </ul>

          {/* Aksiyon Butonları */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-border text-sm font-medium
                         text-muted hover:text-charcoal hover:border-charcoal
                         transition-colors duration-150"
            >
              Kapat
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 flex items-center justify-center gap-2
                         py-2.5 px-4 rounded-lg bg-sage text-white text-sm font-semibold
                         hover:bg-sage-d active:scale-[0.98]
                         transition-all duration-150 shadow-sm"
            >
              <Sparkles size={14} />
              14 Gün Ücretsiz Başla
              <ArrowRight size={14} className="ml-0.5" />
            </button>
          </div>

          {/* Alt not */}
          <p className="text-center text-xs text-muted mt-3">
            Kredi kartı gerekmez · İstediğiniz zaman iptal edin
          </p>
        </div>
      </div>
    </div>
  )
}
