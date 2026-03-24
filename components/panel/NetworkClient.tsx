'use client'
// components/panel/NetworkClient.tsx

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Users, UserPlus, Building2, Check, X,
  Clock, Mail, Search, UserCheck, UserX,
  ChevronRight, Trash2,
} from 'lucide-react'

/* ─── Tipler ──────────────────────────────────────────────────────────────── */
interface Profile {
  id: string; full_name: string; title?: string; slug?: string; email?: string
}

interface Connection {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  requester?: Profile
  addressee?: Profile
}

interface TeamMember {
  id: string; psychologist_id: string; role: string; status: 'pending' | 'accepted' | 'rejected' | 'blocked'; joined_at: string
  profile?: Profile
}

interface TeamInvitation {
  id: string; team_id: string; psychologist_id: string; role: string; status: string; joined_at: string
  team?: { id: string; name: string; slug: string; description?: string }
  profile?: Profile
}

interface Team {
  id: string; name: string; slug: string; description?: string | null
  owner_id: string; created_at: string
  members?: TeamMember[]
}

interface Props {
  currentUserId:       string
  sentConnections:     Connection[]
  receivedConnections: Connection[]
  teams:               Team[]
  teamInvitations:     TeamInvitation[]
}

type Tab = 'connections' | 'teams'

/* ─── Yardımcılar ─────────────────────────────────────────────────────────── */
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const cls = size === 'sm' ? 'w-7 h-7 text-[10px]'
            : size === 'lg' ? 'w-11 h-11 text-sm'
            : 'w-9 h-9 text-xs'
  return (
    <div className={`${cls} rounded-full bg-sage flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'accepted')
    return <span className="pill-green">Bağlı</span>
  if (status === 'pending')
    return <span className="pill-orange flex items-center gap-1"><Clock size={10} /> Bekliyor</span>
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700">
      <X size={10} /> Reddedildi
    </span>
  )
}

/* ─── Ana bileşen ─────────────────────────────────────────────────────────── */
export default function NetworkClient({
  currentUserId, sentConnections, receivedConnections, teams: initialTeams, teamInvitations: initialTeamInvitations,
}: Props) {
  const [tab,          setTab]          = useState<Tab>('connections')
  const [sent,         setSent]         = useState(sentConnections)
  const [received,     setReceived]     = useState(receivedConnections)
  const [teams,        setTeams]        = useState(initialTeams)
  const [teamInvitations, setTeamInvitations] = useState(initialTeamInvitations)
  const [email,        setEmail]        = useState('')
  const [teamName,     setTeamName]     = useState('')
  const [teamDesc,     setTeamDesc]     = useState('')
  const [addMemberEmail, setAddMemberEmail] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [teamModal,    setTeamModal]    = useState(false)
  const [memberModal,  setMemberModal]  = useState<string | null>(null) // team.id

  const pendingReceived = received.filter(c => c.status === 'pending')
  const acceptedConns   = [
    ...sent.filter(c => c.status === 'accepted'),
    ...received.filter(c => c.status === 'accepted'),
  ]
  const pendingSent     = sent.filter(c => c.status === 'pending')
  const rejectedInvites = teamInvitations.filter(inv => inv.status === 'rejected')

  /* ── Bağlantı isteği gönder ──────────────────────────────────────────── */
  async function sendConnect(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const res = await fetch('/api/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(s => [data, ...s])
      setEmail('')
      toast.success(`${data.addressee_name ?? 'Meslektaşınıza'} bağlantı isteği gönderildi!`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  /* ── İsteği yanıtla ──────────────────────────────────────────────────── */
  async function respond(id: string, status: 'accepted' | 'rejected') {
    const res = await fetch('/api/network', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'respond', connection_id: id, status }),
    })
    if (res.ok) {
      setReceived(r => r.map(c => c.id === id ? { ...c, status } : c))
      toast.success(status === 'accepted' ? '✅ Bağlantı kabul edildi!' : 'Reddedildi')
    } else {
      toast.error('İşlem başarısız')
    }
  }

  /* ── Bağlantıyı kaldır ───────────────────────────────────────────────── */
  async function removeConn(id: string) {
    if (!confirm('Bu bağlantıyı kaldırmak istediğinize emin misiniz?')) return
    const res = await fetch(`/api/network?connection_id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSent(s => s.filter(c => c.id !== id))
      setReceived(r => r.filter(c => c.id !== id))
      toast.success('Bağlantı kaldırıldı')
    }
  }

  /* ── Takım oluştur ───────────────────────────────────────────────────── */
  async function createTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!teamName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_team', name: teamName.trim(), description: teamDesc.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeams(t => [{ ...data, members: [] }, ...t])
      setTeamName(''); setTeamDesc('')
      setTeamModal(false)
      toast.success('Takım oluşturuldu! 🎉')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  /* ── Takım davetini yanıtla ───────────────────────────────────────────── */
  async function respondToTeamInvitation(teamId: string, status: 'accepted' | 'rejected') {
    setLoading(true)
    try {
      const res = await fetch('/api/network', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond_team_invite', team_id: teamId, status }),
      })
      if (res.ok) {
        setTeamInvitations(inv => inv.filter(inv => inv.team_id !== teamId))
        toast.success(status === 'accepted' ? '✅ Takım daveti kabul edildi!' : 'Takım daveti reddedildi')
      } else {
        const data = await res.json()
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız')
    } finally {
      setLoading(false)
    }
  }

  /* ── Reddedilen daveti geri al ───────────────────────────────────────── */
  async function reInviteTeamMember(teamId: string, invitationId: string) {
    setLoading(true)
    try {
      // Önce mevcut daveti bulup status'ünü pending yap
      const res = await fetch('/api/network', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond_team_invite', team_id: teamId, status: 'pending' }),
      })
      if (res.ok) {
        // Daveti reddilenler listesinden kaldır
        setTeamInvitations(inv => inv.filter(inv => inv.id !== invitationId))
        // Bekleyen davetler listesine ekle (isteğe bağlı)
        // setTeamInvitations(inv => [...inv.filter(inv => inv.id !== invitationId), { ...updatedInvitation, status: 'pending' }])
        toast.success('✅ Davet yeniden gönderildi!')
      } else {
        const data = await res.json()
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız')
    } finally {
      setLoading(false)
    }
  }

  /* ── Takıma üye ekle ────────────────────────────────────────────────── */
  async function addMember(teamId: string) {
    if (!addMemberEmail.trim()) return
    setLoading(true)
    try {
      // Önce e-posta ile psikolog ara
      const searchRes = await fetch('/api/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'find_by_email', email: addMemberEmail.trim() }),
      })
      const found = await searchRes.json()
      if (!searchRes.ok) throw new Error(found.error)

      const addRes = await fetch('/api/network', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_member', team_id: teamId, psychologist_id: found.id }),
      })
      const added = await addRes.json()
      if (!addRes.ok) throw new Error(added.error)

      // State güncelle
      setTeams(ts => ts.map(t =>
        t.id !== teamId ? t : {
          ...t,
          members: [...(t.members ?? []), {
            id: added.id, psychologist_id: found.id, role: 'member', status: 'pending', joined_at: added.joined_at,
            profile: { id: found.id, full_name: found.full_name, title: found.title, slug: found.slug },
          }],
        }
      ))
      setAddMemberEmail('')
      setMemberModal(null)
      toast.success(`${found.full_name} takıma eklendi!`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eklenemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Tab başlıkları */}
      <div className="flex gap-1 mb-6 bg-cream rounded-xl p-1">
        {([
          { key: 'connections', label: 'Bağlantılar', icon: Users,
            badge: pendingReceived.length, count: acceptedConns.length },
          { key: 'teams',       label: 'Takımlar',    icon: Building2,
            badge: teamInvitations.length, count: teams.length },
        ] as const).map(({ key, label, icon: Icon, badge, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
              ${tab === key
                ? 'bg-white shadow-sm text-charcoal'
                : 'text-muted hover:text-charcoal'}`}>
            <Icon size={15} />
            {label}
            {count > 0 && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold
                ${tab === key ? 'bg-sage-pale text-sage' : 'bg-cream text-muted'}`}>
                {count}
              </span>
            )}
            {badge > 0 && (
              <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════ BAĞLANTILAR SEKMESİ ═══════════════════════════════ */}
      {tab === 'connections' && (
        <div className="space-y-5">

          {/* Davet formu */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <UserPlus size={15} className="text-sage" />
              Meslektaş Ekle
            </h3>
            <p className="text-xs text-muted mb-4">
              Psikopanel kayıtlı meslektaşınızın e-posta adresiyle bağlantı isteği gönderin.
            </p>
            <form onSubmit={sendConnect} className="flex gap-3">
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  className="input pl-9"
                  type="email"
                  placeholder="meslektasin@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary disabled:opacity-60 whitespace-nowrap flex items-center gap-1.5">
                {loading ? 'Gönderiliyor…' : <><UserPlus size={14} /> İstek Gönder</>}
              </button>
            </form>
          </div>

          {/* Gelen bekleyen istekler */}
          {pendingReceived.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-orange-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <h3 className="text-sm font-semibold text-orange-800">
                  {pendingReceived.length} Gelen İstek
                </h3>
              </div>
              <ul className="divide-y divide-border/60">
                {pendingReceived.map(c => (
                  <li key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-cream/40 transition-colors">
                    <Avatar name={c.requester?.full_name ?? '?'} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.requester?.full_name ?? '—'}</p>
                      <p className="text-xs text-muted truncate">{c.requester?.title ?? ''}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => respond(c.id, 'accepted')}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                        <Check size={12} /> Kabul
                      </button>
                      <button onClick={() => respond(c.id, 'rejected')}
                        className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1 text-red-500 hover:border-red-300">
                        <X size={12} /> Reddet
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UserCheck size={14} className="text-green-600" />
                Bağlantılarım
                <span className="text-xs text-muted font-normal">({acceptedConns.length})</span>
              </h3>
              {teams.length > 0 && acceptedConns.length > 0 && (
                <span className="text-xs text-muted">Takıma davet etmek için üzerine gelin</span>
              )}
            </div>
            {acceptedConns.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Users size={32} className="mx-auto text-muted opacity-30 mb-3" />
                <p className="text-sm text-muted">Henüz bağlantınız yok.</p>
                <p className="text-xs text-muted mt-1">Yukarıdan meslektaşlarınızı davet edin.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {acceptedConns.map(c => {
                  const other = c.requester_id === currentUserId ? c.addressee : c.requester
                  return (
                    <li key={c.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-cream/30 transition-colors group">
                      <Avatar name={other?.full_name ?? '?'} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{other?.full_name ?? '—'}</p>
                        <p className="text-xs text-muted truncate">{other?.title ?? ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="pill-green hidden sm:inline-flex">Bağlı</span>
                        {teams.length > 0 && other?.id && (
                          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                            <select
                              defaultValue=""
                              onChange={async (e) => {
                                const teamId = e.target.value
                                if (!teamId || !other?.id) return
                                e.target.value = ''
                                try {
                                  const res = await fetch('/api/network', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'add_member', team_id: teamId, psychologist_id: other.id }),
                                  })
                                  const data = await res.json()
                                  if (!res.ok) throw new Error(data.error)
                                  toast.success(`${other.full_name} takıma davet edildi!`)
                                } catch (err: unknown) {
                                  toast.error(err instanceof Error ? err.message : 'Davet gönderilemedi')
                                }
                              }}
                              className="text-xs border border-sage text-sage rounded-lg px-2 py-1 pr-6 bg-white appearance-none cursor-pointer hover:bg-sage/5 transition-colors"
                              title="Takıma davet et"
                            >
                              <option value="" disabled>Takıma Davet Et</option>
                              {teams
                                .filter(t => t.owner_id === currentUserId)
                                .filter(t => !(t.members ?? []).some(m => m.psychologist_id === other?.id))
                                .map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))
                              }
                            </select>
                          </div>
                        )}
                        <button
                          onClick={() => removeConn(c.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 p-1"
                          title="Bağlantıyı kaldır"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Gönderilen bekleyen istekler */}
          {pendingSent.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-semibold text-muted flex items-center gap-2">
                  <Clock size={13} />
                  Yanıt Bekleyen İstekler ({pendingSent.length})
                </h3>
              </div>
              <ul className="divide-y divide-border/60">
                {pendingSent.map(c => (
                  <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-cream border border-border flex items-center justify-center text-xs font-bold text-muted flex-shrink-0">
                      {c.addressee?.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.addressee?.full_name ?? '—'}</p>
                      <p className="text-xs text-muted">{c.addressee?.title ?? ''}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reddedilen istekler */}
          {sent.filter(c => c.status === 'rejected').length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-semibold text-muted flex items-center gap-2">
                  <UserX size={13} className="text-red-400" />
                  Reddedilen İstekler
                </h3>
              </div>
              <ul className="divide-y divide-border/60">
                {sent.filter(c => c.status === 'rejected').map(c => (
                  <li key={c.id} className="flex items-center gap-4 px-5 py-3.5 opacity-60">
                    <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0">
                      {c.addressee?.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate line-through">{c.addressee?.full_name ?? '—'}</p>
                    </div>
                    <StatusBadge status="rejected" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ TAKIMLAR SEKMESİ ══════════════════════════════════ */}
      {tab === 'teams' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button onClick={() => setTeamModal(true)}
              className="btn-primary flex items-center gap-1.5">
              <Building2 size={15} />
              Yeni Takım / Klinik
            </button>
          </div>

          {/* Bekleyen Takım Davetleri */}
          {teamInvitations.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-orange-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <h3 className="text-sm font-semibold text-orange-800">
                  {teamInvitations.length} Bekleyen Takım Daveti
                </h3>
              </div>
              <ul className="divide-y divide-border/60">
                {teamInvitations.map(inv => (
                  <li key={inv.id} className="flex items-center gap-4 px-5 py-4 hover:bg-cream/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-charcoal flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{inv.team?.name ?? '—'}</p>
                      <p className="text-xs text-muted truncate">{inv.team?.description ?? ''}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => respondToTeamInvitation(inv.team_id, 'accepted')}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                        <Check size={12} /> Kabul Et
                      </button>
                      <button onClick={() => respondToTeamInvitation(inv.team_id, 'rejected')}
                        className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1 text-red-500 hover:border-red-300">
                        <X size={12} /> Reddet
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aktif Takımlarım */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Building2 size={14} className="text-sage" />
                Aktif Takımlarım
                <span className="text-xs text-muted font-normal">({teams.length})</span>
              </h3>
            </div>
            {teams.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Building2 size={32} className="mx-auto text-muted opacity-30 mb-3" />
                <p className="text-sm text-muted">Henüz takımınız yok.</p>
                <p className="text-xs text-muted mt-1">Klinik veya araştırma grupları oluşturun, meslektaşlarınızı ekleyin.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {teams.map(team => (
                  <li key={team.id} className="hover:bg-cream/30 transition-colors">
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-charcoal flex items-center justify-center flex-shrink-0">
                            <Building2 size={18} className="text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">{team.name}</h4>
                            {team.description && (
                              <p className="text-xs text-muted mt-0.5">{team.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="pill-sage">{team.members?.filter(m => m.status === 'accepted').length ?? 1} üye</span>
                          <a
                            href={`/panel/takimlar/${team.slug}`}
                            className="btn-outline py-1 px-2.5 text-xs flex items-center gap-1"
                          >
                            <ChevronRight size={12} /> Takım Paneli
                          </a>
                        </div>
                      </div>
                      {/* Üye listesi */}
                      {team.members && team.members.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/40">
                          <div className="flex flex-wrap gap-2">
                            {team.members.filter(m => m.status === 'accepted').map(m => (
                              <div key={m.id} className="flex items-center gap-2 text-xs text-muted">
                                <Avatar name={m.profile?.full_name ?? '?'} size="sm" />
                                <span>{m.profile?.full_name ?? '—'}</span>
                                {m.role === 'owner' && <span className="text-accent">👑</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reddedilen Davetler */}
          {rejectedInvites.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-red-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <h3 className="text-sm font-semibold text-red-800">
                  {rejectedInvites.length} Reddedilen Davet
                </h3>
              </div>
              <ul className="divide-y divide-border/60">
                {rejectedInvites.map(inv => (
                  <li key={inv.id} className="flex items-center gap-4 px-5 py-4 hover:bg-cream/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-charcoal flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{inv.team?.name ?? '—'}</p>
                      <p className="text-xs text-muted truncate">{inv.team?.description ?? ''}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <span className="pill-red text-xs">Reddedildi</span>
                      <button 
                        onClick={() => reInviteTeamMember(inv.team_id!, inv.id)}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                        title="Daveti yeniden gönder"
                      >
                        <UserPlus size={12} /> Tekrar Davet Et
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Takım oluşturma modal ─────────────────────────────────────────── */}
      {teamModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Yeni Takım / Klinik</h3>
              <button onClick={() => setTeamModal(false)} className="text-muted text-2xl leading-none hover:text-charcoal">×</button>
            </div>
            <form onSubmit={createTeam} className="p-6 space-y-4">
              <div>
                <label className="label">Takım / Klinik Adı *</label>
                <input className="input" placeholder="ör. Ankara Klinik Grubu"
                  value={teamName} onChange={e => setTeamName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Açıklama <span className="text-muted font-normal">(opsiyonel)</span></label>
                <textarea className="input resize-none" rows={2}
                  placeholder="Bu takımın amacı, odak alanı…"
                  value={teamDesc} onChange={e => setTeamDesc(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setTeamModal(false)} className="btn-outline flex-1 justify-center">
                  İptal
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60">
                  {loading ? 'Oluşturuluyor…' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Üye ekleme modal ─────────────────────────────────────────────── */}
      {memberModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Takıma Üye Ekle</h3>
              <button onClick={() => setMemberModal(null)} className="text-muted text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-muted">
                Psikopanel kayıtlı meslektaşınızın e-posta adresini girin.
              </p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    className="input pl-9"
                    type="email"
                    placeholder="meslektasin@email.com"
                    value={addMemberEmail}
                    onChange={e => setAddMemberEmail(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => addMember(memberModal)}
                  disabled={loading || !addMemberEmail.trim()}
                  className="btn-primary disabled:opacity-60 whitespace-nowrap"
                >
                  {loading ? 'Ekleniyor…' : 'Ekle'}
                </button>
              </div>
              <button onClick={() => setMemberModal(null)} className="btn-outline w-full justify-center">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
