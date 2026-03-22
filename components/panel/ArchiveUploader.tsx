'use client'
// components/panel/ArchiveUploader.tsx

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { UploadCloud, X, FileText, Loader2, CheckCircle2, Tag, AlignLeft, Lock } from 'lucide-react'

// ── Demo Paywall entegrasyonu ─────────────────────────────────────────────────
import { useDemoUser }  from '@/hooks/useDemoUser'
import DemoPaywallModal from '@/components/panel/DemoPaywallModal'
// ─────────────────────────────────────────────────────────────────────────────

interface Props { userId: string }

interface UploadedFile {
  id:            string
  name:          string
  size:          number
  type:          string
  status:        'uploading' | 'success' | 'error'
  errorMessage?: string
}

export default function ArchiveUploader({ userId }: Props) {
  const [isDragOver,        setIsDragOver]        = useState(false)
  const [filesState,        setFilesState]        = useState<UploadedFile[]>([])
  const [uploadNote,        setUploadNote]        = useState('')
  const [selectedCategory,  setSelectedCategory]  = useState('auto')

  // ── Demo Paywall state ──────────────────────────────────────────────────────
  const { isDemoUser }                = useDemoUser()
  const [paywallOpen, setPaywallOpen] = useState(false)

  function guardDemo(): boolean {
    if (isDemoUser) { setPaywallOpen(true); return true }
    return false
  }
  // ───────────────────────────────────────────────────────────────────────────

  const router   = useRouter()
  const supabase = createClient()

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  function determineCategory(fileName: string) {
    if (selectedCategory !== 'auto') return selectedCategory
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    if (['pdf'].includes(ext))                          return 'PDF Dökümanlar'
    if (['doc','docx','txt','rtf'].includes(ext))       return 'Metin Belgeleri'
    if (['jpg','jpeg','png','svg','gif','webp'].includes(ext)) return 'Görseller'
    if (['xls','xlsx','csv'].includes(ext))             return 'Tablolar'
    if (['mp4','mp3','wav','mov'].includes(ext))        return 'Medya'
    return 'Diğer Dökümanlar'
  }

  // Storage bucket'ı kontrol et / oluştur
  const ensureBucket = async (): Promise<void> => {
    const res = await fetch('/api/setup/storage', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (data.sql_required) {
        throw new Error(
          'Storage henuz yapilandirilmamis. Supabase SQL Editor\'da 003_storage.sql dosyasini calistirin, ' +
          'ardindan Supabase Dashboard > Storage > Policies\'den RLS policy kontrolu yapin.'
        )
      }
      throw new Error(data.error || 'Storage yapılandırılamadı')
    }
  }

  const uploadSingleFile = async (file: File) => {
    const fileId      = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const storagePath = `uploads/${userId}/${fileId}`
    const finalCategory = determineCategory(file.name)

    setFilesState(prev => [...prev, { id: fileId, name: file.name, size: file.size, type: file.type, status: 'uploading' }])

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Oturum doğrulanamadı. Lütfen sayfayı yenileyin.')

      // İlk deneyin - bucket yoksa otomatik oluştur ve tekrar dene
      let { error: storageError } = await supabase.storage
        .from('psychologist-documents')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })

      if (storageError?.message?.toLowerCase().includes('bucket')) {
        // Bucket yok - otomatik kur ve tekrar dene
        await ensureBucket()
        const retry = await supabase.storage
          .from('psychologist-documents')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })
        storageError = retry.error
      }

      if (storageError) throw storageError

      const { error: dbError } = await supabase.from('files').insert({
        psychologist_id: user.id,
        file_name:    file.name,
        storage_path: storagePath,
        file_type:    file.type || 'unknown',
        file_size:    file.size,
        category:     finalCategory,
        notes:        uploadNote || null,
      })
      if (dbError) throw dbError

      setFilesState(prev => prev.map(f => f.id === fileId ? { ...f, status: 'success' } : f))
      toast.success(`${file.name} başarıyla yüklendi.`)
      return true
    } catch (error: unknown) {
      const errorMsg = (error instanceof Error ? error.message : null) || 'Bilinmeyen bir hata oluştu'
      setFilesState(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', errorMessage: errorMsg } : f))
      toast.error(`Hata: ${errorMsg}`)
      return false
    }
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (guardDemo()) return  // 🔒 Demo engeli

    const fileArray = Array.from(files)
    if (fileArray.some(f => f.size > 10 * 1024 * 1024)) {
      toast.error('Maksimum dosya boyutu 10 MB sınırını aşamaz.'); return
    }
    let successCount = 0
    for (const file of fileArray) {
      const isOk = await uploadSingleFile(file)
      if (isOk) successCount++
    }
    if (successCount > 0) { setUploadNote(''); router.refresh() }
  }, [userId, uploadNote, selectedCategory, router, supabase, isDemoUser])

  // ── Sürükle-bırak ─────────────────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  // ── Dosya input onChange ───────────────────────────────────────────────────
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (guardDemo()) {                          // 🔒 Demo engeli — input sıfırla
      e.target.value = ''; return
    }
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
  }

  const removeFileFromList = (id: string) => setFilesState(prev => prev.filter(f => f.id !== id))

  return (
    <section className="bg-white p-6 rounded-2xl border border-border shadow-sm">

      {/* ── Demo Paywall Modal ─────────────────────────────────────────────── */}
      <DemoPaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />

      {/* ── Demo Banner ───────────────────────────────────────────────────── */}
      {isDemoUser && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Lock size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Demo modundasınız.</span>{' '}
            Sisteme yeni dosya yükleyemezsiniz.{' '}
            <button onClick={() => setPaywallOpen(true)}
              className="font-semibold underline underline-offset-2 hover:no-underline">
              Tam sürümü başlatın →
            </button>
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* Kategori */}
        <div className="flex-1">
          <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
            <Tag className="w-4 h-4" /> Kategori / Klasör
          </label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            disabled={isDemoUser}
            className="w-full bg-cream/50 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="auto">✨ Otomatik (Uzantıya Göre Ayır)</option>
            <option value="PDF Dökümanlar">PDF Dökümanlar</option>
            <option value="Metin Belgeleri">Metin Belgeleri (Word, TXT)</option>
            <option value="Görseller">Görseller</option>
            <option value="Tablolar">Tablolar (Excel, CSV)</option>
            <option value="Diğer Dökümanlar">Diğer</option>
          </select>
        </div>

        {/* Not */}
        <div className="flex-[2]">
          <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
            <AlignLeft className="w-4 h-4" /> Yüklenecek Dosyalar İçin Not (Opsiyonel)
          </label>
          <input
            type="text"
            placeholder="Örn: Pazartesi günkü seans için hazırlanan materyaller..."
            value={uploadNote}
            onChange={e => setUploadNote(e.target.value)}
            disabled={isDemoUser}
            className="w-full bg-cream/50 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* ── Yükleme alanı ─────────────────────────────────────────────────── */}
      <div
        className={`relative group flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-xl transition-all
          ${isDemoUser
            ? 'border-amber-200 bg-amber-50/40 cursor-not-allowed'
            : isDragOver
              ? 'border-sage bg-sage-pale/50 cursor-pointer'
              : 'border-sage-l hover:bg-sage-pale/50 hover:border-sage-l cursor-pointer'
          }`}
        onDrop={isDemoUser ? e => { e.preventDefault(); setPaywallOpen(true) } : onDrop}
        onDragOver={e => { e.preventDefault(); if (!isDemoUser) setIsDragOver(true) }}
        onDragLeave={e => { e.preventDefault(); setIsDragOver(false) }}
        onClick={isDemoUser ? () => setPaywallOpen(true) : undefined}
      >
        {/* Gizli file input — sadece normal mod */}
        {!isDemoUser && (
          <input
            type="file"
            multiple
            onChange={onFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            title="Dosya seçmek için tıklayın"
          />
        )}

        <div className="flex flex-col items-center text-center space-y-3 pointer-events-none">
          <div className={`p-4 rounded-full transition-all duration-300
            ${isDemoUser
              ? 'bg-amber-50 text-amber-400'
              : 'bg-sage-pale text-sage group-hover:scale-110 group-hover:bg-sage-pale'}`}>
            {isDemoUser
              ? <Lock className="w-8 h-8" />
              : <UploadCloud className="w-8 h-8" />
            }
          </div>
          <div>
            {isDemoUser ? (
              <>
                <h4 className="text-base font-semibold text-amber-700">Dosya yükleme kısıtlı</h4>
                <p className="text-sm text-amber-600 mt-1">
                  Demo modunda dosya yükleyemezsiniz.{' '}
                  <span className="font-semibold underline">Tam sürüm için tıklayın →</span>
                </p>
              </>
            ) : (
              <>
                <h4 className="text-base font-semibold text-charcoal">Dosyaları buraya sürükleyip bırakın</h4>
                <p className="text-sm text-muted mt-1">
                  veya gözatmak için <span className="text-sage font-medium">tıklayın</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Yükleme listesi */}
      {filesState.length > 0 && (
        <div className="mt-4 grid gap-2">
          {filesState.map(file => (
            <div key={file.id} className="flex flex-col gap-1 p-3 bg-white border border-border rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
                </div>
                {file.status === 'uploading' && <Loader2 className="w-5 h-5 text-sage animate-spin" />}
                {file.status === 'success'   && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {file.status === 'error'     && (
                  <button onClick={() => removeFileFromList(file.id)} className="text-red-500 hover:text-red-700 p-1">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {file.status === 'error' && file.errorMessage && (
                <p className="text-xs text-red-500 mt-1 pl-8">Sebep: {file.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
