// app/layout.tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const dmSans = localFont({
  src: [
    { path: '../public/fonts/dm-sans/dm-sans-latin-300-normal.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/dm-sans/dm-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/dm-sans/dm-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/dm-sans/dm-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

const dmSerif = localFont({
  src: [
    { path: '../public/fonts/dm-serif/dm-serif-display-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/dm-serif/dm-serif-display-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
})

export const metadata: Metadata = {
  title: 'PsikoPanel',
  description: 'Psikologlar için pratik yönetim sistemi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${dmSans.variable} ${dmSerif.variable} font-sans bg-cream text-charcoal`} suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              background: '#2c2c2c',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}
