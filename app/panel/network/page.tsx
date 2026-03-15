// app/panel/network/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NetworkClient from '@/components/panel/NetworkClient'

export default async function NetworkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: sentConns },
    { data: receivedConns },
    { data: ownedTeams },
    { data: memberTeams },
    { data: teamInvitations },
  ] = await Promise.all([
    supabase
      .from('connections')
      .select('*, addressee:profiles!addressee_id(id, full_name, title, slug, email)')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('connections')
      .select('*, requester:profiles!requester_id(id, full_name, title, slug, email)')
      .eq('addressee_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          id, psychologist_id, role, status, joined_at,
          profile:profiles!psychologist_id(id, full_name, title, slug)
        )
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('team_members')
      .select(`
        team:teams(
          id, name, description, owner_id, created_at, slug,
          members:team_members(
            id, psychologist_id, role, joined_at,
            profile:profiles!psychologist_id(id, full_name, title, slug)
          )
        )
      `)
      .eq('psychologist_id', user.id)
      .neq('role', 'owner'),
    supabase
      .from('team_members')
      .select(`
        *, team:teams(id, name, slug, description),
        profile:profiles!psychologist_id(id, full_name, title, slug)
      `)
      .eq('psychologist_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  // Supabase join'leri normalize et
  function normalizeConnections(data: unknown[] | null, joinField: 'addressee' | 'requester') {
    return (data ?? []).map((item: unknown) => {
      const c = item as Record<string, unknown>
      return {
        id: c.id as string,
        requester_id: c.requester_id as string,
        addressee_id: c.addressee_id as string,
        status: c.status as 'pending' | 'accepted' | 'rejected',
        created_at: c.created_at as string,
        updated_at: (c.updated_at ?? c.created_at) as string,
        [joinField]: Array.isArray(c[joinField])
          ? (c[joinField] as unknown[])[0] ?? null
          : c[joinField] ?? null,
      }
    })
  }

  function normalizeTeams(data: unknown[] | null) {
    return (data ?? []).map((team: unknown) => {
      const t = team as Record<string, unknown>
      return {
        ...t,
        members: t.members ? (t.members as unknown[]).map((member: unknown) => {
          const m = member as Record<string, unknown>
          return {
            ...m,
            profile: Array.isArray(m.profile) 
              ? m.profile[0] ?? null 
              : m.profile ?? null,
          }
        }) : null,
      }
    })
  }

  function normalizeMemberTeams(data: unknown[] | null) {
    return (data ?? []).map((item: unknown) => {
      const tm = item as Record<string, unknown>
      const team = tm.team as Record<string, unknown>
      return {
        ...tm,
        team: {
          ...team,
          members: team.members ? (team.members as unknown[]).map((member: unknown) => {
            const m = member as Record<string, unknown>
            return {
              ...m,
              profile: Array.isArray(m.profile) 
                ? m.profile[0] ?? null 
                : m.profile ?? null,
            }
          }) : null,
        }
      }
    })
  }

  function normalizeInvitations(data: unknown[] | null) {
    return (data ?? []).map((item: unknown) => {
      const inv = item as Record<string, unknown>
      return {
        id: inv.id as string,
        team_id: inv.team_id as string,
        psychologist_id: inv.psychologist_id as string,
        role: inv.role as 'owner' | 'member',
        status: inv.status as 'pending' | 'accepted' | 'rejected',
        created_at: inv.created_at as string,
        joined_at: (inv.joined_at ?? inv.created_at) as string,
        profile: Array.isArray(inv.profile) 
          ? inv.profile[0] ?? null 
          : inv.profile ?? null,
      }
    })
  }

  // Tekrar eden takımları birleştir (sahip + üye olunan)
  const memberTeamList = (normalizeMemberTeams(memberTeams as unknown[]))
    .map((m: { team: unknown }) => m.team)
    .filter(Boolean) as typeof ownedTeams
  const teamIds = new Set((ownedTeams ?? []).map((t: { id: string }) => t.id))
  const extraTeams = (memberTeamList ?? []).filter((t: { id: string }) => !teamIds.has(t.id))
  const teams = [...(normalizeTeams(ownedTeams as unknown[])), ...extraTeams]

  // Bağlı meslektaşların paylaştığı test sayıları (istatistik)
  const acceptedIds = [
    ...(normalizeConnections(sentConns as unknown[], 'addressee') ?? []).filter((c: any) => c.status === 'accepted').map(c => c.addressee_id),
    ...(normalizeConnections(receivedConns as unknown[], 'requester') ?? []).filter((c: any) => c.status === 'accepted').map(c => c.requester_id),
  ]

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between pl-10 md:pl-0">
          <div>
            <h2 className="font-serif text-xl">Meslektaş Ağı</h2>
            <p className="text-xs text-muted mt-0.5">
              Meslektaşlarınızla bağlanın, takımlar ve klinikler oluşturun
            </p>
          </div>
          {acceptedIds.length > 0 && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-muted">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {acceptedIds.length} aktif bağlantı
            </span>
          )}
        </div>
      </header>

      <NetworkClient
        currentUserId={user.id}
        sentConnections={normalizeConnections(sentConns as unknown[], 'addressee')}
        receivedConnections={normalizeConnections(receivedConns as unknown[], 'requester')}
        teams={teams ?? []}
        teamInvitations={normalizeInvitations(teamInvitations as unknown[])}
      />
    </>
  )
}
