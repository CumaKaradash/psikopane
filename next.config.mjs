// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deployment için output yapılandırması
  // 'standalone' büyük projeler için daha iyi — default bırakıyoruz (Vercel otomatik)

  // Resim optimizasyonu
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'cdnjs.cloudflare.com' },
      // Harici avatar URL'leri için
      { protocol: 'https', hostname: '**' },
    ],
  },

  // web-push Node.js modülü Edge Runtime'a giremez → server-only olarak işaretle
  serverExternalPackages: ['web-push'],

  // ESLint build'i bloklamasın (CI'da ayrı çalıştırılır)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript hataları build'i durdurmasın — Vercel'da CI ayrıca çalışır
  // Production'da false yapılabilir ama iterasyon sürecinde true bırak
  typescript: {
    ignoreBuildErrors: false,
  },

  // Güvenlik başlıkları
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff'        },
          { key: 'X-Frame-Options',           value: 'DENY'           },
          { key: 'X-XSS-Protection',          value: '1; mode=block'  },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Service Worker için gerekli header
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',   value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type',    value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
