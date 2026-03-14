'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  fileId: string
  storagePath: string
  fileName: string
}

export default function FileActions({ fileId, storagePath, fileName }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const { data, error } = await supabase.storage
        .from('psychologist-documents')
        .createSignedUrl(storagePath, 3600) // 1 saatlik geçici URL
      
      if (error) throw error
      if (data?.signedUrl) {
        const response = await fetch(data.signedUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      toast.error('Dosya indirilemedi.')
      console.error(error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return
    
    try {
      setIsDeleting(true)
      
      const { error: storageError } = await supabase.storage
        .from('psychologist-documents')
        .remove([storagePath])
        
      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        
      if (dbError) throw dbError

      toast.success('Dosya başarıyla silindi.')
      router.refresh()
    } catch (error) {
      toast.error('Silme işlemi başarısız oldu.')
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
        onClick={handleDownload}
        disabled={isDownloading}
        className="text-muted hover:text-sage transition-colors p-1 disabled:opacity-50"
        title="İndir"
      >
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </button>
      <button 
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-muted hover:text-red-600 transition-colors p-1 disabled:opacity-50"
        title="Kaldır"
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}