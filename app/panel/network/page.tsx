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

  // Tekrar eden takımları birleştir (sahip + üye olunan)
  const memberTeamList = (memberTeams ?? [])
    .map((m: { team: unknown }) => m.team)
    .filter(Boolean) as typeof ownedTeams
  const teamIds = new Set((ownedTeams ?? []).map((t: { id: string }) => t.id))
  const extraTeams = (memberTeamList ?? []).filter((t: { id: string }) => !teamIds.has(t.id))
  const teams = [...(ownedTeams ?? []), ...extraTeams]

  // Bağlı meslektaşların paylaştığı test sayıları (istatistik)
  const acceptedIds = [
    ...(sentConns ?? []).filter(c => c.status === 'accepted').map(c => c.addressee_id),
    ...(receivedConns ?? []).filter(c => c.status === 'accepted').map(c => c.requester_id),
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
        sentConnections={sentConns ?? []}
        receivedConnections={receivedConns ?? []}
        teams={teams ?? []}
        teamInvitations={teamInvitations ?? []}
      />
    </>
  )
}
