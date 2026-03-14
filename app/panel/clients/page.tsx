// app/panel/clients/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientsClient from '@/components/panel/ClientsClient'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('psychologist_id', user.id)
    .order('full_name')

  const { data: profile } = await supabase
    .from('profiles')
    .select('slug')
    .eq('id', user.id)
    .single()

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <h2 className="font-serif text-xl pl-10 md:pl-0">Danışanlar</h2>
      </header>
      <ClientsClient clients={clients ?? []} profileSlug={profile?.slug ?? ''} />
    </>
  )
}
