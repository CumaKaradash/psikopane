'use client'
// components/panel/TestResultsModal.tsx

import { useState, useEffect } from 'react'
import { X, User, Calendar, MessageSquare, CheckCircle, Download } from 'lucide-react'
import type { Test, TestResponse, TestQuestion } from '@/lib/types'

interface Props {
  test:        Test
  responses:   TestResponse[]
  onClose:     () => void
}

function getAnswerText(
  answer: { question_index: number; option_index: number; score: number },
  question: TestQuestion
): string {
  if (question.options && question.options[answer.option_index]) {
    return question.options[answer.option_index].label
  }
  return String(answer.option_index)
}

export default function TestResultsModal({ test, responses, onClose }: Props) {
  const [selectedResponse, setSelectedResponse] = useState<TestResponse | null>(
    responses[0] ?? null
  )
  const [generating, setGenerating] = useState(false)

  // ESC ile kapat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function generatePDF() {
    if (!selectedResponse) return
    setGenerating(true)
    try {
      // Dynamic import — client-only, SSR'da çalışmaz
      const { pdf, Document, Page, Text, View, StyleSheet, Font } =
        await import('@react-pdf/renderer')

      // Font kaydı (sadece ilk çalışmada)
      try {
        Font.register({
          family: 'Roboto',
          src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
        })
      } catch {
        // Zaten kayıtlıysa hata verebilir — yoksay
      }

      const styles = StyleSheet.create({
        page:         { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 24 },
        title:        { fontSize: 18, marginBottom: 12, fontWeight: 'bold' },
        subtitle:     { fontSize: 11, marginBottom: 6, color: '#555' },
        sectionTitle: { fontSize: 13, marginBottom: 10, fontWeight: 'bold', marginTop: 12 },
        question:     { fontSize: 10, marginBottom: 4, fontWeight: 'bold' },
        answer:       { fontSize: 10, marginBottom: 8, marginLeft: 10, color: '#333' },
        row:          { marginBottom: 8 },
      })

      const PdfDoc = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>{test.title}</Text>
            <Text style={styles.subtitle}>
              Kullanıcı: {selectedResponse.respondent_name ?? 'Misafir'}
            </Text>
            <Text style={styles.subtitle}>
              Tarih: {new Date(selectedResponse.completed_at).toLocaleDateString('tr-TR')}
            </Text>
            {selectedResponse.total_score !== null && (
              <Text style={styles.subtitle}>
                Toplam Puan: {selectedResponse.total_score}
              </Text>
            )}
            <Text style={styles.sectionTitle}>Sorular ve Cevaplar</Text>
            {test.questions.map((question, index) => {
              const answer = selectedResponse.answers.find(
                (a: { question_index: number; option_index: number; score: number }) =>
                  a.question_index === index
              )
              return (
                <View key={index} style={styles.row}>
                  <Text style={styles.question}>
                    {index + 1}. {question.text}
                  </Text>
                  <Text style={styles.answer}>
                    Cevap: {answer ? getAnswerText(answer, question) : 'Cevaplanmadi'}
                  </Text>
                </View>
              )
            })}
          </Page>
        </Document>
      )

      const blob = await pdf(<PdfDoc />).toBlob()
      const url  = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), {
        href:     url,
        download: `${test.slug}-sonuc.pdf`,
      })
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF olusturulamadi:', err)
      alert('PDF olusturulurken bir hata olustu.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold">{test.title}</h2>
            <p className="text-xs text-muted">{responses.length} yanıt</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-cream flex items-center justify-center text-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Yanıt listesi */}
          <div className="md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto">
            {responses.length === 0 ? (
              <p className="p-4 text-sm text-muted">Henuz yanit yok.</p>
            ) : (
              <ul>
                {responses.map(r => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelectedResponse(r)}
                      className={`w-full text-left px-4 py-3 border-b border-border/40 last:border-0 hover:bg-cream/50 transition-colors
                        ${selectedResponse?.id === r.id ? 'bg-sage-pale' : ''}`}
                    >
                      <p className="text-xs font-medium truncate">
                        {r.respondent_name ?? 'Misafir'}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {new Date(r.completed_at).toLocaleDateString('tr-TR')}
                      </p>
                      {r.total_score !== null && (
                        <p className="text-[10px] font-semibold text-sage mt-0.5">
                          Puan: {r.total_score}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Yanıt detayı */}
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedResponse ? (
              <p className="text-sm text-muted text-center py-8">Bir yanıt seçin</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <User size={13} className="text-muted" />
                      {selectedResponse.respondent_name ?? 'Misafir'}
                    </p>
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      <Calendar size={11} />
                      {new Date(selectedResponse.completed_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <button
                    onClick={generatePDF}
                    disabled={generating}
                    className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <Download size={12} />
                    {generating ? 'Hazırlanıyor…' : 'PDF İndir'}
                  </button>
                </div>

                {selectedResponse.total_score !== null && (
                  <div className="bg-sage-pale rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                    <CheckCircle size={16} className="text-sage" />
                    <span className="text-sm font-semibold text-sage">
                      Toplam Puan: {selectedResponse.total_score}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {test.questions.map((q, i) => {
                    const answer = selectedResponse.answers.find(
                      (a: { question_index: number; option_index: number; score: number }) =>
                        a.question_index === i
                    )
                    return (
                      <div key={i} className="border border-border/60 rounded-xl p-4">
                        <p className="text-xs font-semibold mb-2 text-charcoal">
                          {i + 1}. {q.text}
                        </p>
                        {answer ? (
                          <div className="flex items-center gap-2">
                            <span className="pill-green text-xs">
                              <MessageSquare size={10} className="inline mr-1" />
                              {getAnswerText(answer, q)}
                            </span>
                            {answer.score !== undefined && (
                              <span className="text-xs text-muted">
                                ({answer.score} puan)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">Cevaplanmadı</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
