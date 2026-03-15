// app/panel/takimlar/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import TeamDashboardClient from '@/app/panel/takimlar/[slug]/TeamDashboardClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function TeamDashboardPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')

  // Takım bilgilerini ve üyelik durumunu kontrol et
  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      *,
      members:team_members(
        id, psychologist_id, role, status, joined_at,
        profile:profiles!psychologist_id(id, full_name, title, slug, avatar_url)
      ),
      owner:profiles!owner_id(id, full_name, title, slug, avatar_url)
    `)
    .eq('slug', slug)
    .single()

  if (error || !team) {
    notFound()
  }

  // Kullanıcının bu takıma erişim yetkisi var mı?
  const memberCheck = team.members?.find(
    (member: any) => member.psychologist_id === user.id
  )
  
  const isOwner = team.owner_id === user.id
  const isAcceptedMember = memberCheck?.status === 'accepted'

  // Eğer takım sahibi değilse VE kabul edilmiş bir üye değilse giriş yasak!
  if (!isOwner && !isAcceptedMember) {
    redirect('/panel/network?error=unauthorized')
  }

  return <TeamDashboardClient team={team} currentUserId={user.id} isOwner={isOwner} userRole={memberCheck?.role || 'owner'} />
}
