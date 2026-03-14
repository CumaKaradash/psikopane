// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      colors: {
        sage:     { DEFAULT: '#5a7a6a', d: '#4a6a5a', l: '#8aaa96', pale: '#e8f0eb' },
        cream:    '#faf8f4',
        border:   '#e2ddd6',
        charcoal: '#2c2c2c',
        muted:    '#7a7a7a',
        accent:   { DEFAULT: '#c4845a', l: '#f5e8df' },
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        sm: '0 1px 4px rgba(0,0,0,0.06)',
        md: '0 4px 20px rgba(0,0,0,0.09)',
        lg: '0 12px 40px rgba(0,0,0,0.13)',
      },
    },
  },
  plugins: [],
}

export default config
