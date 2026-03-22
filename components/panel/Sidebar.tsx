'use client'
// components/panel/Sidebar.tsx
// Mobil: hamburger toggle + overlay; Masaüstü: sabit sol kenar çubuğu

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Users, Archive,
  Link2, FlaskConical, BookOpen, BarChart3, LogOut, Menu, X,
  Network, Globe, Newspaper, Settings, MessageSquare,
} from 'lucide-react'

interface Props {
  profile: { full_name: string; title: string; slug: string }
}

const nav = [
  { label: 'Genel', items: [
    { href: '/panel',          icon: LayoutDashboard, label: 'Gösterge' },
    { href: '/panel/calendar', icon: CalendarDays,    label: 'Takvim'   },
  ]},
  { label: 'Danışanlar', items: [
    { href: '/panel/clients',  icon: Users,   label: 'Danışanlar' },
    { href: '/panel/archive',  icon: Archive, label: 'Arşiv'      },
  ]},
  { label: 'Araçlar', items: [
    { href: '/panel/links',    icon: Link2,        label: 'Link Gönder' },
    { href: '/panel/tests',    icon: FlaskConical, label: 'Testler'     },
    { href: '/panel/homework', icon: BookOpen,     label: 'Ödevler'     },
  ]},
  { label: 'Finans', items: [
    { href: '/panel/finance', icon: BarChart3, label: 'Muhasebe' },
  ]},
  { label: 'Platform', items: [
    { href: '/panel/network',   icon: Network,   label: 'Meslektaş Ağı'    },
    { href: '/panel/community', icon: Globe,     label: 'Topluluk'         },
    { href: '/panel/news',      icon: Newspaper, label: 'Psikoloji Bülteni' },
  ]},
  { label: 'Hesap', items: [
    { href: '/panel/feedback',  icon: MessageSquare,  label: 'Geri Bildirim' },
    { href: '/panel/settings',  icon: Settings,      label: 'Profil Ayarları'  },
  ]},
]

export default function Sidebar({ profile }: Props) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const initials = profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const SidebarContent = () => (
    <div className="w-60 bg-charcoal text-white flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl text-white">PsikoPanel</h1>
          <p className="text-white/35 text-[11px] mt-0.5">Pratik Yönetim</p>
        </div>
        {/* Mobilde kapat butonu */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-white/50 hover:text-white p-1"
          aria-label="Menüyü kapat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {nav.map(section => (
          <div key={section.label}>
            <p className="px-6 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
              {section.label}
            </p>
            {section.items.map(({ href, icon: Icon, label }) => {
              const active = href === '/panel' ? path === href : path.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 px-6 py-2.5 text-[13px] transition-all
                    border-l-2 pl-[22px]
                    ${active
                      ? 'text-white bg-white/10 border-sage-l'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
                    }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium leading-tight truncate">{profile.full_name}</p>
            <p className="text-white/35 text-[11px] truncate">{profile.title}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs transition-colors w-full"
        >
          <LogOut size={13} />
          Çıkış Yap
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Masaüstü: sabit sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen z-50 flex-col shadow-lg">
        <SidebarContent />
      </aside>

      {/* ── Mobil: hamburger butonu (header içinde konumlanır) ────────── */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 bg-charcoal text-white p-2 rounded-lg shadow-md"
        aria-label="Menüyü aç"
      >
        <Menu size={20} />
      </button>

      {/* ── Mobil: overlay + drawer ───────────────────────────────────── */}
      {open && (
        <>
          {/* Karartma */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <aside className="md:hidden fixed top-0 left-0 h-screen z-50 flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
