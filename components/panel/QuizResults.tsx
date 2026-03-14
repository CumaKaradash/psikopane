'use client'
// components/panel/QuizResults.tsx

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'text' | 'scale'
  options?: string[]
  correct_answer?: string | number
  points?: number
}

interface Answer {
  question_id: string
  answer_text?: string
  answer_number?: number
  selected_option?: string
}

interface TestResult {
  id: string
  test_title: string
  respondent_name: string
  completed_at: string
  total_score: number | null
  max_score: number | null
  status: 'completed' | 'in_progress' | 'not_started'
  answers: Answer[]
  test: {
    questions: Question[]
    settings: {
      passingScore: number
      allowRetake: boolean
      showResults: boolean
    }
  }
}

interface Props {
  result: TestResult
  onClose: () => void
  onRetake?: () => void
}

export default function QuizResults({ result, onClose, onRetake }: Props) {
  const [isClient, setIsClient] = useState(false)
  const [showScoringModal, setShowScoringModal] = useState(false)
  const [scoringMethod, setScoringMethod] = useState<'percentage' | 'points' | 'weighted'>('percentage')
  const [customFormula, setCustomFormula] = useState('')
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null)

  // Prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  const questions = result.test.questions
  const answers = result.answers

  // Calculate scores based on method
  const calculateScore = () => {
    let totalScore = 0
    let maxScore = 0

    if (scoringMethod === 'percentage') {
      // Percentage based scoring
      let correctCount = 0
      questions.forEach(question => {
        maxScore += 100 // Her soru 100 puan
        const answer = answers.find(a => a.question_id === question.id)
        
        if (question.type === 'multiple_choice' && answer) {
          const correctAnswer = question.correct_answer
          if (answer.selected_option === correctAnswer) {
            correctCount++
          }
        } else if (question.type === 'text' && answer?.answer_text) {
          // Text questions için basit doğrulama
          correctCount++
        } else if (question.type === 'scale' && answer?.answer_number !== undefined) {
          // Scale questions için 100 üzerinden puanlama
          const percentage = (answer.answer_number / 10) * 100
          totalScore += percentage
        }
      })
      totalScore = (correctCount / questions.length) * 100
    } else if (scoringMethod === 'points') {
      // Points based scoring
      questions.forEach(question => {
        const points = question.points || 1
        maxScore += points
        const answer = answers.find(a => a.question_id === question.id)
        
        if (question.type === 'multiple_choice' && answer) {
          const correctAnswer = question.correct_answer
          if (answer.selected_option === correctAnswer) {
            totalScore += points
          }
        } else if (question.type === 'text' && answer?.answer_text) {
          totalScore += points
        } else if (question.type === 'scale' && answer?.answer_number !== undefined) {
          totalScore += answer.answer_number
        }
      })
    } else if (scoringMethod === 'weighted') {
      // Weighted scoring with custom formula
      try {
        // Custom formula evaluation (basic implementation)
        const formula = customFormula || 'total_correct * 2 + bonus_points'
        let correctCount = 0
        let bonusPoints = 0
        
        questions.forEach((question, index) => {
          const answer = answers.find(a => a.question_id === question.id)
          if (question.type === 'multiple_choice' && answer) {
            if (answer.selected_option === question.correct_answer) {
              correctCount++
            }
          } else if (question.type === 'text' && answer?.answer_text) {
            bonusPoints += 5 // Text questions için bonus
          } else if (question.type === 'scale' && answer?.answer_number !== undefined) {
            bonusPoints += Math.floor(answer.answer_number / 2)
          }
        })
        
        // Simple formula evaluation
        totalScore = correctCount * 2 + bonusPoints
      } catch (error) {
        console.error('Formula evaluation error:', error)
        totalScore = (result.total_score ?? 0)
      }
    }

    setCalculatedScore(totalScore)
  }

  useEffect(() => {
    calculateScore()
  }, [scoringMethod, customFormula, questions, answers])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Mükemmel'
    if (score >= 60) return 'İyi'
    return 'Geçti'
  }

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Test Sonuçları</h3>
            <p className="text-sm text-muted mt-1">
              {result.test_title} • {format(new Date(result.completed_at), 'd MMMM yyyy HH:mm', { locale: tr })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-muted text-xl leading-none hover:text-charcoal"
          >
            ×
          </button>
        </div>

        {/* Score Summary */}
        <div className="px-6 py-4 bg-gradient-to-r from-sage-pale to-cream border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-charcoal">Toplam Puan</p>
              <p className={`text-3xl font-bold ${getScoreColor(calculatedScore ?? result.total_score ?? 0)}`}>
                {Math.round(calculatedScore ?? result.total_score ?? 0)}/100
              </p>
              <p className="text-xs text-sage mt-1">
                {getScoreLabel(calculatedScore ?? result.total_score ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-charcoal">Durum</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                result.status === 'completed' ? 'bg-green-100 text-green-800' : 
                result.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {result.status === 'completed' ? 'Tamamlandı' : 
                 result.status === 'in_progress' ? 'Devam Ediyor' : 'Başlanmadı'}
              </span>
            </div>
          </div>
        </div>

        {/* Scoring Options */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Puanlama Metodu</p>
              <p className="text-xs text-muted mt-1">Sonucu nasıl puanlamak istersiniz?</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setScoringMethod('percentage')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  scoringMethod === 'percentage' 
                    ? 'bg-sage text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yüzde
              </button>
              <button 
                onClick={() => setScoringMethod('points')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  scoringMethod === 'points' 
                    ? 'bg-sage text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Puan
              </button>
              <button 
                onClick={() => setScoringMethod('weighted')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  scoringMethod === 'weighted' 
                    ? 'bg-sage text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ağırlıklı
              </button>
            </div>
          </div>
        </div>

        {/* Custom Formula */}
        {scoringMethod === 'weighted' && (
          <div className="px-6 py-4 border-b border-border">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Matematiksel Formül</label>
                <textarea 
                  className="w-full p-3 border border-border rounded-lg text-sm font-mono"
                  rows={3}
                  placeholder="Örnek: (correct_count / total_questions) * 100 + bonus_points"
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={calculateScore}
                  className="btn-outline btn-sm"
                >
                  Hesapla
                </button>
                <button 
                  onClick={() => setCustomFormula('')}
                  className="btn-outline btn-sm"
                >
                  Sıfırla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions and Answers */}
        <div className="px-6 py-4">
          <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Sorular ve Cevaplar</h4>
          <div className="space-y-4">
            {questions.map((question, index) => {
              const answer = answers.find(a => a.question_id === question.id)
              const isCorrect = question.type === 'multiple_choice' 
                ? answer?.selected_option === question.correct_answer
                : question.type === 'text' 
                ? !!answer?.answer_text
                : question.type === 'scale' 
                ? answer?.answer_number !== undefined
                : false

              return (
                <div key={question.id} className={`border rounded-lg p-4 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium">{question.text}</p>
                      <p className="text-xs text-muted mt-1">
                        Soru {index + 1} • {question.type === 'multiple_choice' ? 'Çoktan seçmeli' : question.type === 'text' ? 'Metin' : 'Ölçekli'}
                      </p>
                    </div>
                    <div className="text-xs font-medium">
                      {isCorrect ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                          Doğru ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800">
                          Yanlış ✗
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Answer Display */}
                  <div className="text-sm">
                    {question.type === 'multiple_choice' && answer && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted">Seçilen Cevap:</p>
                        <div className="bg-white border border-gray-200 rounded p-2">
                          <p className="font-medium">{answer.selected_option}</p>
                        </div>
                        {question.options && (
                          <div className="mt-2 space-y-1">
                          {question.options.map((option, optIndex) => (
                            <div 
                              key={optIndex}
                              className={`text-xs p-2 rounded ${
                                option === answer.selected_option 
                                  ? 'bg-sage-pale border-sage-l' 
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                        )}
                      </div>
                    )}
                    {question.type === 'text' && answer && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted">Verilen Cevap:</p>
                        <div className="bg-white border border-gray-200 rounded p-2">
                          <p className="text-sm whitespace-pre-wrap">{answer.answer_text}</p>
                        </div>
                      </div>
                    )}
                    {question.type === 'scale' && answer && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted">Verilen Puan:</p>
                        <div className="bg-white border border-gray-200 rounded p-2">
                          <p className="text-sm font-medium">{answer.answer_number}/10</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button 
            onClick={onClose}
            className="btn-outline flex-1 justify-center"
          >
            Kapat
          </button>
          {result.status === 'completed' && result.test.settings.allowRetake && (
            <button 
              onClick={onRetake}
              className="btn-primary flex-1 justify-center"
            >
              Tekrar Test Et
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
