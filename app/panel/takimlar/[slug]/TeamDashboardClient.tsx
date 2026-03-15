'use client'
// app/panel/takimlar/[slug]/TeamDashboardClient.tsx

import { useState } from 'react'
import { 
  Calendar, Users, FileText, DollarSign, 
  Archive, Home, Settings, ChevronRight,
  Clock, CheckCircle, UserPlus, TrendingUp
} from 'lucide-react'
import TeamCalendar from '@/components/panel/TeamCalendar'
import TeamClients from '@/components/panel/TeamClients'

interface TeamMember {
  id: string
  psychologist_id: string
  role: string
  status: string
  joined_at: string
  profile?: {
    id: string
    full_name: string
    title: string
    slug: string
    avatar_url?: string
  }
}

interface Team {
  id: string
  name: string
  slug: string
  description?: string
  owner_id: string
  created_at: string
  bio?: string
  session_types: string[]
  avatar_url?: string
  members?: TeamMember[]
  owner?: {
    id: string
    full_name: string
    title: string
    slug: string
    avatar_url?: string
  }
}

interface Props {
  team: Team
  currentUserId: string
  isOwner: boolean
  userRole: string
}

type Tab = 'overview' | 'calendar' | 'clients' | 'finance' | 'tests' | 'homework' | 'archive'

export default function TeamDashboardClient({ team, currentUserId, isOwner, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const acceptedMembers = team.members?.filter(m => m.status === 'accepted') || []
  const pendingMembers = team.members?.filter(m => m.status === 'pending') || []

  const tabs = [
    { key: 'overview' as Tab, label: 'Genel Bakış', icon: Home },
    { key: 'calendar' as Tab, label: 'Takvim & Randevular', icon: Calendar },
    { key: 'clients' as Tab, label: 'Danışan Havuzu', icon: Users },
    { key: 'finance' as Tab, label: 'Ortak Muhasebe', icon: DollarSign },
    { key: 'tests' as Tab, label: 'Testler', icon: FileText },
    { key: 'homework' as Tab, label: 'Ödevler', icon: FileText },
    { key: 'archive' as Tab, label: 'Klinik Arşivi', icon: Archive },
  ]

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Takım İstatistikleri */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sage/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-sage" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{acceptedMembers.length}</p>
                    <p className="text-xs text-muted">Aktif Üye</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-muted">Bu Ay Randevu</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₺0</p>
                    <p className="text-xs text-muted">Bu Ay Gelir</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-orange" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-muted">Aktif Test</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bekleyen Üyeler */}
            {pendingMembers.length > 0 && (
              <div className="card">
                <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-orange" />
                  <h3 className="text-sm font-semibold">Bekleyen Üyeler ({pendingMembers.length})</h3>
                </div>
                <div className="p-5 space-y-3">
                  {pendingMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-cream/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold">
                          {member.profile?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.profile?.full_name}</p>
                          <p className="text-xs text-muted">{member.profile?.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="pill-orange text-xs">
                          <Clock className="w-3 h-3" /> Bekliyor
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Takım Üyeleri */}
            <div className="card">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-sage" />
                  Takım Üyeleri
                </h3>
                <span className="text-xs text-muted">{acceptedMembers.length} üye</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {acceptedMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-white text-sm font-bold">
                        {member.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{member.profile?.full_name}</p>
                        <p className="text-xs text-muted">{member.profile?.title}</p>
                      </div>
                      {member.role === 'owner' && (
                        <span className="text-xs font-bold text-accent">👑 Sahip</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 'calendar':
        return <TeamCalendar teamId={team.id} />

      case 'clients':
        return <TeamClients teamId={team.id} />

      case 'finance':
        return (
          <div className="card p-8 text-center">
            <DollarSign className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ortak Muhasebe</h3>
            <p className="text-muted">Bu özellik yakında eklenecek.</p>
          </div>
        )

      case 'tests':
        return (
          <div className="card p-8 text-center">
            <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Testler</h3>
            <p className="text-muted">Bu özellik yakında eklenecek.</p>
          </div>
        )

      case 'homework':
        return (
          <div className="card p-8 text-center">
            <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ödevler</h3>
            <p className="text-muted">Bu özellik yakında eklenecek.</p>
          </div>
        )

      case 'archive':
        return (
          <div className="card p-8 text-center">
            <Archive className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Klinik Arşivi</h3>
            <p className="text-muted">Bu özellik yakında eklenecek.</p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-cream/30">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-charcoal flex items-center justify-center">
                {team.avatar_url ? (
                  <img src={team.avatar_url} alt={team.name} className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <span className="text-white font-bold text-lg">{team.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h1 className="font-serif text-xl">{team.name}</h1>
                {team.description && (
                  <p className="text-sm text-muted mt-0.5">{team.description}</p>
                )}
              </div>
            </div>
            {isOwner && (
              <button className="btn-outline flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Ayarlar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-border">
        <div className="px-4 md:px-8">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === key
                    ? 'border-sage text-sage bg-sage/5'
                    : 'border-transparent text-muted hover:text-charcoal'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 md:px-8 py-6">
        {renderTabContent()}
      </main>
    </div>
  )
}
