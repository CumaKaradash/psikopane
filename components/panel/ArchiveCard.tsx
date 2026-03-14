'use client'
// components/panel/ArchiveCard.tsx

import { useState } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Search, FileQuestion, BookOpen, MoreVertical } from 'lucide-react'

interface TestResponse {
  id: string
  test_id: string
  respondent_name: string | null
  total_score: number | null
  completed_at: string
}

interface HomeworkResponse {
  id: string
  homework_id: string
  respondent_name: string | null
  completed_at: string
}

interface Client {
  id: string
  full_name: string
  status: string
  created_at: string
}

interface Props {
  testResponses: TestResponse[]
  homeworkResponses: HomeworkResponse[]
  clients: Client[]
  testTitles: Record<string, string>
  homeworkTitles: Record<string, string>
}

interface FileItem {
  id: string
  type: 'test' | 'homework'
  title: string
  respondent: string
  date: string
  score: number | null
  icon: any
  color: string
  bg: string
}

export default function ArchiveCard({ testResponses, homeworkResponses, clients, testTitles, homeworkTitles }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  // Bütün dosyaları tek bir formatta birleştir (yeni arşiv sayfası gibi)
  const allFiles: FileItem[] = [
    ...(testResponses ?? []).map(r => ({
      id: `test-${r.id}`,
      type: 'test' as const,
      title: `${testTitles[r.test_id] ?? 'Test'} Sonucu`,
      respondent: r.respondent_name ?? 'Anonim',
      date: r.completed_at,
      score: r.total_score,
      icon: FileQuestion,
      color: 'text-sage',
      bg: 'bg-sage-pale'
    })),
    ...(homeworkResponses ?? []).map(r => ({
      id: `hw-${r.id}`,
      type: 'homework' as const,
      title: `${homeworkTitles[r.homework_id] ?? 'Ödev'} Yanıtı`,
      respondent: r.respondent_name ?? 'Anonim',
      date: r.completed_at,
      score: null,
      icon: BookOpen,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Arama filtrelemesi
  const filteredFiles = allFiles.filter(file => 
    file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.respondent.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Son 5 dosyayı göster
  const recentFiles = filteredFiles.slice(0, 5)

  const totalFiles = allFiles.length
  const totalClients = clients?.length ?? 0

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Arşiv</h3>
            <p className="text-xs text-muted mt-0.5">{totalFiles} dosya, {totalClients} danışan</p>
          </div>
          <a href="/panel/archive" className="text-xs text-sage hover:underline">Tümünü Gör →</a>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {/* Arama */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder="Arşivde ara..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-cream/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent w-full transition-all"
          />
        </div>

        {/* Son Dosyalar */}
        {recentFiles.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Son Dosyalar</h4>
              <span className="text-xs text-muted">{filteredFiles.length} sonuç</span>
            </div>
            <div className="space-y-2">
              {recentFiles.map(file => {
                const FileIcon = file.icon
                return (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${file.bg}`}>
                        <FileIcon className={`w-4 h-4 ${file.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.title}</p>
                        <p className="text-xs text-muted">
                          {file.respondent} · {format(new Date(file.date), 'd MMM', { locale: tr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.type === 'test' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage-pale text-charcoal">
                          {file.score !== null ? `${file.score} Puan` : 'Hesaplanmadı'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Tamamlandı
                        </span>
                      )}
                      <button className="text-muted hover:text-sage transition-colors opacity-0 group-hover:opacity-100 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {filteredFiles.length > 5 && (
                <div className="text-center pt-2">
                  <a href="/panel/archive" className="text-xs text-sage hover:underline">
                    +{filteredFiles.length - 5} dosya daha görüntüle
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            {searchQuery ? (
              <>
                <p className="text-sm text-muted">\"{searchQuery}\" için sonuç bulunamadı</p>
                <p className="text-xs text-muted mt-1">Başka anahtar kelimelerle deneyin</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">Henüz arşiv kaydı yok</p>
                <p className="text-xs text-muted mt-1">Test yanıtları ve ödevler burada görünecek</p>
              </>
            )}
          </div>
        )}

        {/* İstatistikler */}
        {(totalFiles > 0 || totalClients > 0) && (
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <div className="text-center p-3 bg-sage-pale/50 rounded-lg">
              <p className="text-lg font-semibold text-sage">{totalFiles}</p>
              <p className="text-xs text-muted">Toplam Dosya</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-lg font-semibold text-blue-600">{totalClients}</p>
              <p className="text-xs text-muted">Danışan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
