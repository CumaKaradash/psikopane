'use client'
// components/panel/ArchivePageClient.tsx — Sürükle-bırak dosya + URL arşivi + önizleme

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  UploadCloud, Link2, FileText, FileImage, File as FileIcon,
  Trash2, Download, ExternalLink, Search, Eye, X,
  FlaskConical, BookOpen, Users, ChevronDown, ChevronUp,
  Loader2, CheckCircle2,
} from 'lucide-react'

interface DbFile {
  id: string; psychologist_id: string; file_name: string
  storage_path: string; file_type: string; file_size: number
  category: string; notes: string | null; created_at: string
}
interface UrlEntry { id: string; url: string; label: string; created_at: string }
interface TestResp  { id: string; test_id: string; respondent_name: string | null; total_score: number | null; completed_at: string }
interface HwResp    { id: string; homework_id: string; respondent_name: string | null; completed_at: string }
interface Client    { id: string; full_name: string; status: string; created_at: string }

interface Props {
  userId: string
  files: DbFile[]
  testResponses: TestResp[]
  hwResponses: HwResp[]
  clients: Client[]
  testMap: Record<string, string>
  hwMap: Record<string, string>
}

type Tab = 'files' | 'urls' | 'tests' | 'homework' | 'clients'

const TAB_CFG: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'files',    label: 'Dosyalar',    icon: FileText    },
  { key: 'urls',     label: 'URL\'ler',     icon: Link2       },
  { key: 'tests',    label: 'Test Sonuçları', icon: FlaskConical },
  { key: 'homework', label: 'Ödevler',     icon: BookOpen    },
  { key: 'clients',  label: 'Danışanlar',  icon: Users       },
]

function fileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage
  if (type === 'application/pdf') return FileText
  return FileIcon
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

// URL arşivini localStorage'ta değil, basit state'te tut (session scope)
// Kalıcı olması için ayrı bir DB tablosu gerekir — şimdilik Supabase files tablosuna url_entry category ile ekle
const URL_CATEGORY = '__url_entry__'

export default function ArchivePageClient({ userId, files: initialFiles, testResponses, hwResponses, clients, testMap, hwMap }: Props) {
  const supabase = createClient()
  const [tab, setTab]         = useState<Tab>('files')
  const [files, setFiles]     = useState(initialFiles.filter(f => f.category !== URL_CATEGORY))
  const [urls, setUrls]       = useState<UrlEntry[]>(
    initialFiles.filter(f => f.category === URL_CATEGORY).map(f => ({
      id: f.id, url: f.storage_path, label: f.file_name, created_at: f.created_at
    }))
  )
  const [search, setSearch]       = useState('')
  const [isDrag, setIsDrag]       = useState(false)
  const [uploading, setUploading] = useState<string[]>([])
  const [previewFile, setPreviewFile] = useState<DbFile | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [newUrl, setNewUrl]   = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Dosya yükle ──────────────────────────────────────────────────────────
  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList)
    if (arr.some(f => f.size > 15 * 1024 * 1024)) { toast.error('Maks. dosya boyutu 15 MB'); return }

    for (const file of arr) {
      const fileId = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const path   = `uploads/${userId}/${fileId}`
      setUploading(u => [...u, fileId])
      try {
        const { error: storErr } = await supabase.storage.from('psychologist-documents').upload(path, file, { upsert: false })
        if (storErr) throw storErr

        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        const cat = ['pdf'].includes(ext) ? 'PDF' : file.type.startsWith('image/') ? 'Görsel' : ['doc','docx','txt'].includes(ext) ? 'Belge' : 'Diğer'

        const { data: dbRow, error: dbErr } = await supabase.from('files').insert({
          psychologist_id: userId, file_name: file.name,
          storage_path: path, file_type: file.type || 'unknown',
          file_size: file.size, category: cat, notes: null,
        }).select().single()
        if (dbErr) throw dbErr
        setFiles(fs => [dbRow as DbFile, ...fs])
        toast.success(`${file.name} yüklendi`)
      } catch (e: unknown) {
        toast.error(`Hata: ${e instanceof Error ? e.message : 'Yükleme başarısız'}`)
      } finally {
        setUploading(u => u.filter(id => id !== fileId))
      }
    }
  }, [userId, supabase])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDrag(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }

  // ── Dosya sil ────────────────────────────────────────────────────────────
  async function deleteFile(f: DbFile) {
    if (!confirm(`"${f.file_name}" silinecek. Emin misiniz?`)) return
    setDeleting(f.id)
    try {
      await supabase.storage.from('psychologist-documents').remove([f.storage_path])
      await supabase.from('files').delete().eq('id', f.id)
      setFiles(fs => fs.filter(x => x.id !== f.id))
      if (previewFile?.id === f.id) { setPreviewFile(null); setPreviewUrl(null) }
      toast.success('Silindi')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    } finally { setDeleting(null) }
  }

  // ── Dosya indir / önizle ─────────────────────────────────────────────────
  async function openPreview(f: DbFile) {
    setPreviewFile(f); setPreviewUrl(null)
    const { data } = await supabase.storage.from('psychologist-documents').createSignedUrl(f.storage_path, 3600)
    if (data?.signedUrl) setPreviewUrl(data.signedUrl)
    else toast.error('Önizleme URL\'si alınamadı')
  }

  async function downloadFile(f: DbFile) {
    const { data } = await supabase.storage.from('psychologist-documents').createSignedUrl(f.storage_path, 60)
    if (!data?.signedUrl) { toast.error('İndirme linki alınamadı'); return }
    const a = document.createElement('a')
    a.href = data.signedUrl; a.download = f.file_name; a.click()
  }

  // ── URL ekle ─────────────────────────────────────────────────────────────
  async function addUrl() {
    const url = newUrl.trim()
    if (!url) { toast.error('URL zorunlu'); return }
    if (!/^https?:\/\//.test(url)) { toast.error('URL http:// veya https:// ile başlamalı'); return }
    try {
      // URL'yi files tablosuna özel category ile kaydet
      const { data: row, error } = await supabase.from('files').insert({
        psychologist_id: userId,
        file_name: newLabel.trim() || url,
        storage_path: url,
        file_type: 'url',
        file_size: 0,
        category: URL_CATEGORY,
        notes: null,
      }).select().single()
      if (error) throw error
      const entry: UrlEntry = { id: (row as DbFile).id, url, label: newLabel.trim() || url, created_at: (row as DbFile).created_at }
      setUrls(us => [entry, ...us])
      setNewUrl(''); setNewLabel('')
      toast.success('URL kaydedildi')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Kaydedilemedi')
    }
  }

  async function deleteUrl(id: string) {
    if (!confirm('Bu URL silinecek. Emin misiniz?')) return
    await supabase.from('files').delete().eq('id', id)
    setUrls(us => us.filter(u => u.id !== id))
    toast.success('Silindi')
  }

  // ── Filtrele ─────────────────────────────────────────────────────────────
  const q = search.toLowerCase()
  const filteredFiles   = files.filter(f => f.file_name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
  const filteredUrls    = urls.filter(u => u.label.toLowerCase().includes(q) || u.url.toLowerCase().includes(q))
  const filteredTests   = testResponses.filter(r => (r.respondent_name ?? '').toLowerCase().includes(q) || (testMap[r.test_id] ?? '').toLowerCase().includes(q))
  const filteredHw      = hwResponses.filter(r => (r.respondent_name ?? '').toLowerCase().includes(q) || (hwMap[r.homework_id] ?? '').toLowerCase().includes(q))
  const filteredClients = clients.filter(c => c.full_name.toLowerCase().includes(q))

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Arama */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input className="input pl-9" placeholder="Ara…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-cream rounded-xl p-1 overflow-x-auto">
        {TAB_CFG.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
              ${tab === key ? 'bg-white shadow-sm text-charcoal' : 'text-muted hover:text-charcoal'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── DOSYALAR ────────────────────────────────────────────────────── */}
      {tab === 'files' && (
        <div className="space-y-4">
          {/* Sürükle-bırak alanı */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
              ${isDrag ? 'border-sage bg-sage-pale/60' : 'border-border hover:border-sage hover:bg-sage-pale/20'}`}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setIsDrag(true) }}
            onDragLeave={() => setIsDrag(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />
            <UploadCloud size={32} className={`mx-auto mb-3 ${isDrag ? 'text-sage' : 'text-muted'}`} />
            <p className="text-sm font-medium text-charcoal">Dosyaları buraya sürükleyin</p>
            <p className="text-xs text-muted mt-1">veya tıklayarak seçin · Maks. 15 MB · PDF, görsel, belge</p>
            {uploading.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sage text-sm">
                <Loader2 size={14} className="animate-spin" /> {uploading.length} dosya yükleniyor…
              </div>
            )}
          </div>

          {/* Dosya listesi */}
          {filteredFiles.length === 0 ? (
            <div className="card py-16 text-center">
              <FileIcon size={32} className="mx-auto text-muted opacity-30 mb-3" />
              <p className="text-sm text-muted">{search ? 'Sonuç bulunamadı' : 'Henüz dosya yok'}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-border text-xs text-muted font-medium">{filteredFiles.length} dosya</div>
              <ul className="divide-y divide-border/60">
                {filteredFiles.map(f => {
                  const Icon = fileIcon(f.file_type)
                  const isImg = f.file_type.startsWith('image/')
                  const isPdf = f.file_type === 'application/pdf'
                  return (
                    <li key={f.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-cream/40 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-cream flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.file_name}</p>
                        <p className="text-xs text-muted">{f.category} · {fmtSize(f.file_size)} · {format(new Date(f.created_at), 'd MMM yyyy', { locale: tr })}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {(isImg || isPdf) && (
                          <button onClick={() => openPreview(f)} title="Önizle"
                            className="p-1.5 rounded-lg hover:bg-cream text-muted hover:text-charcoal transition-colors">
                            <Eye size={15} />
                          </button>
                        )}
                        <button onClick={() => downloadFile(f)} title="İndir"
                          className="p-1.5 rounded-lg hover:bg-cream text-muted hover:text-charcoal transition-colors">
                          <Download size={15} />
                        </button>
                        <button onClick={() => deleteFile(f)} disabled={deleting === f.id} title="Sil"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors">
                          {deleting === f.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── URL'LER ─────────────────────────────────────────────────────── */}
      {tab === 'urls' && (
        <div className="space-y-4">
          {/* URL ekle formu */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Link2 size={14} className="text-sage" /> URL Ekle</h3>
            <div className="space-y-3">
              <div>
                <label className="label">URL *</label>
                <input className="input" placeholder="https://example.com/rapor.pdf" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addUrl()} />
              </div>
              <div>
                <label className="label">Etiket <span className="text-muted font-normal">(opsiyonel)</span></label>
                <input className="input" placeholder="ör. 2024 Yıllık Rapor" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addUrl()} />
              </div>
              <button onClick={addUrl} className="btn-primary flex items-center gap-1.5 text-sm">
                <Link2 size={14} /> Kaydet
              </button>
            </div>
          </div>

          {/* URL listesi */}
          {filteredUrls.length === 0 ? (
            <div className="card py-16 text-center">
              <Link2 size={32} className="mx-auto text-muted opacity-30 mb-3" />
              <p className="text-sm text-muted">{search ? 'Sonuç bulunamadı' : 'Henüz URL kaydedilmemiş'}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <ul className="divide-y divide-border/60">
                {filteredUrls.map(u => (
                  <li key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-cream/40 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center flex-shrink-0">
                      <Link2 size={15} className="text-sage" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.label}</p>
                      <p className="text-xs text-muted truncate">{u.url}</p>
                      <p className="text-[10px] text-muted">{format(new Date(u.created_at), 'd MMM yyyy', { locale: tr })}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <a href={u.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-cream text-muted hover:text-sage transition-colors" title="Aç">
                        <ExternalLink size={15} />
                      </a>
                      <button onClick={() => deleteUrl(u.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors" title="Sil">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── TEST SONUÇLARI ───────────────────────────────────────────────── */}
      {tab === 'tests' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-xs text-muted font-medium">{filteredTests.length} yanıt</div>
          {filteredTests.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">Henüz test yanıtı yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-cream">
                    {['Test', 'Yanıtlayan', 'Skor', 'Tarih'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wide border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map(r => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium max-w-[160px] truncate">{testMap[r.test_id] ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-muted">{r.respondent_name ?? 'Anonim'}</td>
                      <td className="px-5 py-3">{r.total_score !== null ? <span className="pill-sage">{r.total_score} puan</span> : <span className="text-muted text-sm">—</span>}</td>
                      <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">{format(new Date(r.completed_at), 'd MMM yyyy HH:mm', { locale: tr })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ÖDEVLER ─────────────────────────────────────────────────────── */}
      {tab === 'homework' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-xs text-muted font-medium">{filteredHw.length} yanıt</div>
          {filteredHw.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">Henüz ödev yanıtı yok</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filteredHw.map(r => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-cream/40 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{hwMap[r.homework_id] ?? '—'}</p>
                    <p className="text-xs text-muted mt-0.5">{r.respondent_name ?? 'Anonim'} · {format(new Date(r.completed_at), 'd MMM yyyy HH:mm', { locale: tr })}</p>
                  </div>
                  <span className="pill-green flex-shrink-0">Tamamlandı</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── DANIŞANLAR ───────────────────────────────────────────────────── */}
      {tab === 'clients' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-xs text-muted font-medium">{filteredClients.length} danışan</div>
          {filteredClients.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">Henüz danışan yok</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filteredClients.map(c => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-cream/40 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted">{format(new Date(c.created_at), 'd MMM yyyy', { locale: tr })}</p>
                  </div>
                  <span className={c.status === 'active' ? 'pill-green' : c.status === 'new' ? 'pill-blue' : 'pill-orange'}>
                    {c.status === 'active' ? 'Aktif' : c.status === 'new' ? 'Yeni' : 'Pasif'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Dosya önizleme modal ──────────────────────────────────────────── */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{previewFile.file_name}</p>
                <p className="text-xs text-muted">{fmtSize(previewFile.file_size)} · {previewFile.category}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {previewUrl && (
                  <a href={previewUrl} download={previewFile.file_name}
                    className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1">
                    <Download size={12} /> İndir
                  </a>
                )}
                <button onClick={() => { setPreviewFile(null); setPreviewUrl(null) }}
                  className="text-muted hover:text-charcoal text-2xl leading-none">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 min-h-[300px]">
              {!previewUrl ? (
                <div className="flex flex-col items-center gap-2 text-muted">
                  <Loader2 size={24} className="animate-spin" />
                  <p className="text-sm">Yükleniyor…</p>
                </div>
              ) : previewFile.file_type.startsWith('image/') ? (
                <img src={previewUrl} alt={previewFile.file_name} className="max-w-full max-h-[70vh] object-contain rounded" />
              ) : previewFile.file_type === 'application/pdf' ? (
                <iframe src={previewUrl} title={previewFile.file_name} className="w-full h-[70vh] rounded" />
              ) : (
                <div className="text-center text-muted p-8">
                  <FileIcon size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Bu dosya türü önizlenemiyor.</p>
                  <a href={previewUrl} download={previewFile.file_name} className="btn-primary mt-4 inline-flex items-center gap-1.5 text-sm">
                    <Download size={14} /> İndir
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
