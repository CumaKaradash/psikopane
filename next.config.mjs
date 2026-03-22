// next.config.mjs
/** @type {import('next').NextConfig} */
// SW versiyonu — her build'de otomatik güncellenir
const BUILD_ID = Date.now().toString(36)

const nextConfig = {
  images: {
    remotePatterns: [
      // Yalnızca Supabase storage ve CDN kaynaklarına izin ver
      // '**' wildcard'ı SSRF ve içerik enjeksiyonu riski oluşturduğu için kaldırıldı
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'cdnjs.cloudflare.com' },
    ],
  },

  // web-push Node.js modülü Edge Runtime'a giremez
  serverExternalPackages: ['web-push'],

  // TypeScript optimizasyonları
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },

  // ESLint optimizasyonları
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib'], // Sadece ana dizinleri tara
  },

  // Güvenlik başlıkları
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff'       },
          { key: 'X-Frame-Options',         value: 'DENY'          },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',          value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type',           value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'X-SW-Version',           value: BUILD_ID },
        ],
      },
    ]
  },
}

export default nextConfig
