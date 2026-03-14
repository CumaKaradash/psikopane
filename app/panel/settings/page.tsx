// app/panel/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from '@/components/panel/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/setup')

  return (
    <>
      <header className="bg-white border-b border-border px-4 md:px-8 py-4 sticky top-0 z-40">
        <div className="pl-10 md:pl-0">
          <h2 className="font-serif text-xl">Profil Ayarları</h2>
          <p className="text-xs text-muted mt-0.5">
            Randevu sayfanızda görünecek bilgileri düzenleyin
          </p>
        </div>
      </header>
      <SettingsClient profile={profile} />
    </>
  )
}
