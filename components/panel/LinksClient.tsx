'use client'
// components/panel/LinksClient.tsx

import toast from 'react-hot-toast'

interface Item { id: string; title: string; slug: string; is_active: boolean }

interface Props {
  tests: Item[]
  homework: Item[]
  profileSlug: string
}

// Bileşen dışında tanımla — React anti-pattern'i önler
function LinkCard({ icon, title, url, type, onCopy }: {
  icon: string; title: string; url: string; type: 'test' | 'odev'; onCopy: (url: string) => void
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="text-2xl flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted mt-0.5">
          {type === 'test' ? 'Test · Danışan doldurur, sonuç sana gelir' : 'Ödev · Danışan yanıtlar, cevaplar sana gelir'}
        </p>
        <div className="bg-cream rounded-lg px-3 py-1.5 font-mono text-xs text-sage mt-2 truncate">
          {url.replace(/^https?:\/\/[^/]+\//, '')}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => onCopy(url)} className="btn-primary py-1.5 px-3 text-xs">
            📋 Linki Kopyala
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-outline py-1.5 px-3 text-xs">
            👁 Önizle
          </a>
        </div>
      </div>
    </div>
  )
}

export default function LinksClient({ tests, homework, profileSlug }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://psikopanel.tr'

  function copy(url: string) {
    navigator.clipboard.writeText(url)
    toast.success('Link kopyalandı!')
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Test Linkleri</h3>
          {tests.length === 0 ? (
            <div className="card px-5 py-8 text-center text-sm text-muted">
              Aktif test yok —{' '}
              <a href="/panel/tests" className="text-sage hover:underline">Test ekle →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map(t => (
                <LinkCard key={t.id} icon="📊" title={t.title}
                  url={`${origin}/${profileSlug}/test/${t.slug}`}
                  type="test" onCopy={copy} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Ödev Linkleri</h3>
          {homework.length === 0 ? (
            <div className="card px-5 py-8 text-center text-sm text-muted">
              Aktif ödev yok —{' '}
              <a href="/panel/homework" className="text-sage hover:underline">Ödev ekle →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {homework.map(hw => (
                <LinkCard key={hw.id} icon="📝" title={hw.title}
                  url={`${origin}/${profileSlug}/odev/${hw.slug}`}
                  type="odev" onCopy={copy} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-sage-pale border border-sage-l rounded-xl p-5">
        <h3 className="text-xs font-bold text-sage uppercase tracking-wider mb-2">Randevu Linki</h3>
        <p className="text-sm text-charcoal font-mono mb-1">{origin}/{profileSlug}/booking</p>
        <p className="text-xs text-muted mb-3">Herkese açık — üye olmadan randevu alabilirler</p>
        <button onClick={() => copy(`${origin}/${profileSlug}/booking`)} className="btn-primary">
          📋 Linki Kopyala
        </button>
      </div>
    </div>
  )
}
