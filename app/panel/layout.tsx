// app/panel/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/panel/Sidebar'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, title, slug')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/setup')

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar profile={profile} />
      {/* Masaüstünde sidebar genişliği kadar boşluk; mobilde yok */}
      <main className="md:ml-60 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  )
}
