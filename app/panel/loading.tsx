// app/panel/loading.tsx
// Panel içi sayfa geçişlerinde Next.js tarafından otomatik gösterilir.
// Suspense boundary görevi görür.

export default function PanelLoading() {
  return (
    <div className="p-4 md:p-6 animate-pulse">

      {/* Header iskelet */}
      <div className="h-8 bg-border/60 rounded-lg w-48 mb-6" />

      {/* Stat kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-border/60" />
            <div className="h-8 bg-border/60 rounded-lg w-16" />
            <div className="h-3 bg-border/40 rounded w-24" />
            <div className="h-3 bg-border/40 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Ana içerik */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sol 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Liste kartı */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/60">
              <div className="h-4 bg-border/60 rounded w-32" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border/40 last:border-0">
                <div className="w-10 h-10 rounded-full bg-border/60 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-border/60 rounded w-40" />
                  <div className="h-3 bg-border/40 rounded w-24" />
                </div>
                <div className="h-5 bg-border/40 rounded-full w-16" />
              </div>
            ))}
          </div>

          {/* İkinci kart */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/60">
              <div className="h-4 bg-border/60 rounded w-40" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border/40 last:border-0">
                <div className="w-12 flex-shrink-0 space-y-1">
                  <div className="h-2 bg-border/60 rounded w-8 mx-auto" />
                  <div className="h-3 bg-border/60 rounded w-10 mx-auto" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-border/60 rounded w-32" />
                  <div className="h-3 bg-border/40 rounded w-20" />
                </div>
                <div className="h-5 bg-border/40 rounded-full w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Sağ 1/3 */}
        <div className="space-y-4">
          {/* Mini takvim */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-border/60 rounded w-4" />
              <div className="h-4 bg-border/60 rounded w-24" />
              <div className="h-4 bg-border/60 rounded w-4" />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded bg-border/40" />
              ))}
            </div>
          </div>

          {/* Finans kartı */}
          <div className="card p-5 space-y-3">
            <div className="h-3 bg-border/60 rounded w-24 mb-4" />
            {[1, 2].map(i => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 bg-border/40 rounded w-12" />
                  <div className="h-3 bg-border/60 rounded w-16" />
                </div>
                <div className="h-1.5 bg-border/40 rounded-full" />
              </div>
            ))}
            <div className="pt-2 border-t border-border/40 flex justify-between">
              <div className="h-3 bg-border/40 rounded w-8" />
              <div className="h-4 bg-border/60 rounded w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
