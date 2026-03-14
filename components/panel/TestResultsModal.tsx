'use client'
// components/panel/TestResultsModal.tsx

import { useState } from 'react'
import { X, User, Calendar, MessageSquare, CheckCircle, Download } from 'lucide-react'

// @react-pdf/renderer — client only, dinamik import ile SSR bypass
let pdfLib: typeof import('@react-pdf/renderer') | null = null
async function getPdfLib() {
  if (!pdfLib) {
    pdfLib = await import('@react-pdf/renderer')
    pdfLib.Font.register({
      family: 'Roboto',
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
    })
  }
  return pdfLib
}

// PDF styles — lazy loaded in generatePDF()

interface TestResponse {
  id: string
  test_id: string
  client_id: string | null
  respondent_name: string | null
  answers: { question_index: number; option_index?: number; answer_text?: string; answer_number?: number; answer_boolean?: boolean | null }[]
  total_score: number | null
  completed_at: string
}

interface TestQuestion {
  text: string
  type: 'multiple_choice' | 'text' | 'scale' | 'true_false'
  options: { label: string }[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  test: {
    id: string
    title: string
    description: string | null
    slug: string
    questions: TestQuestion[]
  }
  responses: TestResponse[]
  profileSlug?: string
}

// Helper function to get answer text
const getAnswerText = (answer: any, question: TestQuestion) => {
  if (question.type === 'multiple_choice' && answer.option_index !== undefined) {
    return question.options[answer.option_index]?.label || 'Seçenek bulunamadı'
  } else if (question.type === 'text' && answer.answer_text) {
    return answer.answer_text
  } else if (question.type === 'scale' && answer.answer_number !== undefined) {
    return `${answer.answer_number}/10`
  } else if (question.type === 'true_false' && answer.answer_boolean !== undefined) {
    return answer.answer_boolean ? 'Doğru' : 'Yanlış'
  }
  return 'Cevap bulunamadı'
}


export default function TestResultsModal({ isOpen, onClose, test, responses, profileSlug }: Props) {
  const [selectedResponse, setSelectedResponse] = useState<TestResponse | null>(null)

  // PDF oluşturma fonksiyonu
  const generatePDF = async () => {
    if (!selectedResponse) return

    const { pdf: pdfFn, Document: Doc, Page: Pg, Text: Txt, View: Vw, StyleSheet: SS } = await getPdfLib()

    const styles = SS.create({
      page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 20 },
      title: { fontSize: 18, marginBottom: 15, fontWeight: 'bold' },
      subtitle: { fontSize: 12, marginBottom: 8 },
      sectionTitle: { fontSize: 14, marginBottom: 12, fontWeight: 'bold' },
      question: { fontSize: 11, marginBottom: 6, fontWeight: 'bold' },
      answer: { fontSize: 10, marginBottom: 8, marginLeft: 10 },
    })

    const PdfDoc = () => (
      <Doc>
        <Pg size="A4" style={styles.page}>
          <Txt style={styles.title}>{test.title}</Txt>
          <Txt style={styles.subtitle}>Kullanıcı: {selectedResponse.respondent_name || 'Misafir'}</Txt>
          <Txt style={styles.subtitle}>Tarih: {new Date(selectedResponse.completed_at).toLocaleDateString('tr-TR')}</Txt>
          <Txt style={styles.sectionTitle}>Sorular ve Cevaplar:</Txt>
          {test.questions.map((question, index) => {
            const answer = selectedResponse.answers.find((a: any) => a.question_index === index)
            return (
              <Vw key={index} style={{ marginBottom: 8 }}>
                <Txt style={styles.question}>{index + 1}. {question.text}</Txt>
                <Txt style={styles.answer}>Cevap: {answer ? getAnswerText(answer, question) : 'Cevaplanmamış'}</Txt>
              </Vw>
            )
          })}
        </Pg>
      </Doc>
    )

    const blob = await pdfFn(<PdfDoc />).toBlob()
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${test.title}_${selectedResponse.respondent_name || 'misafir'}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Debug: Veri yapısını kontrol et

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm md:text-base">{test.title}</h3>
            <p className="text-sm text-muted">Test Sonuçları</p>
          </div>
          <button 
            onClick={onClose}
            className="text-muted text-xl leading-none hover:text-charcoal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {responses.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">
              Bu test için henüz sonuç bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Responses List */}
              <div className="lg:col-span-1">
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Dolduran Kişiler</h4>
                <div className="space-y-2">
                  {responses.map((response) => (
                    <button
                      key={response.id}
                      onClick={() => setSelectedResponse(response)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedResponse?.id === response.id
                          ? 'border-sage bg-sage-pale'
                          : 'border-border hover:border-sage hover:bg-sage-pale/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted" />
                        <span className="font-medium text-sm truncate">
                          {response.respondent_name || 'Misafir'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(response.completed_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Response Details */}
              <div className="lg:col-span-2">
                {selectedResponse ? (
                  <div className="space-y-6">
                    {/* Response Header */}
                    <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-sage-pale flex items-center justify-center">
                          <User className="w-4 h-4 md:w-5 md:h-5 text-sage" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-semibold text-sm md:text-base truncate">
                            {selectedResponse.respondent_name || 'Misafir'}
                          </h5>
                          <p className="text-xs md:text-sm text-muted">
                            {new Date(selectedResponse.completed_at).toLocaleDateString('tr-TR')} · 
                            {new Date(selectedResponse.completed_at).toLocaleTimeString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Questions and Answers */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-muted uppercase tracking-wide">
                          Sorular ve Cevaplar
                        </h4>
                        <button
                          onClick={generatePDF}
                          disabled={!selectedResponse}
                          className="btn-outline py-1 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          PDF İndir
                        </button>
                      </div>
                      <div className="space-y-4">
                        {test.questions.map((question, index) => {
                          const answer = selectedResponse.answers.find(a => a.question_index === index)
                          return (
                            <div key={index} className="border border-border rounded-lg p-3 md:p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-sage-pale flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-sage">{index + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm mb-2 break-words">{question.text}</p>
                                  <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4 text-muted flex-shrink-0" />
                                      <span className="text-sm break-words">
                                        {answer ? getAnswerText(answer, question) : 'Cevaplanmamış'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted">
                    Sonuçları görüntülemek için bir kişi seçin.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
