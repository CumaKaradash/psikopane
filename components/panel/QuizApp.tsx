'use client'
// components/panel/QuizApp.tsx

import { useState } from 'react'
import toast from 'react-hot-toast'

interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'text' | 'scale' | 'true_false'
  options?: { label: string }[]
  correct_answer?: string | number
}

interface Props {
  testId: string
  initialQuestions?: Question[]
  onSave: (questions: Question[]) => void
  onClose: () => void
}

export default function QuizApp({ testId, initialQuestions = [], onSave, onClose }: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'text' | 'scale' | 'true_false'>('multiple_choice')
  const [options, setOptions] = useState<{ label: string }[]>([{ label: '' }])
  const [correctAnswer, setCorrectAnswer] = useState<string | number>('')

  const questionTypes = [
    { value: 'multiple_choice', label: 'Çoktan Seçmeli', description: 'Doğru cevap seçenebilir' },
    { value: 'text', label: 'Metin', description: 'Metin cevabı yazabilir' },
    { value: 'scale', label: 'Ölçekli', description: '0-10 arası puan' },
    { value: 'true_false', label: 'Doğru/Yanlış', description: 'Doğru veya yanlış seçenebilir' }
  ]

  function addQuestion() {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: questionText,
      type: questionType,
      options: questionType === 'multiple_choice' ? options : [],
      correct_answer: questionType === 'scale' ? 5 : questionType === 'true_false' ? 'true' : ''
    }
    
    setQuestions([...questions, newQuestion])
    setCurrentQuestionIndex(questions.length)
    
    // Reset form
    setQuestionText('')
    setQuestionType('multiple_choice')
    setOptions([{ label: '' }])
    setCorrectAnswer('')
  }

  function updateQuestion(index: number, field: keyof Question, value: any) {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value }
    setQuestions(updatedQuestions)
  }

  function deleteQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index))
    if (currentQuestionIndex >= questions.length - 1) {
      setCurrentQuestionIndex(Math.max(0, questions.length - 2))
    }
  }

  function saveQuestions() {
    if (questions.length === 0) {
      toast.error('En az bir soru ekleyin')
      return
    }
    
    onSave(questions)
    onClose()
    toast.success('Sorular kaydedi!')
  }

  const currentQuestion = questions[currentQuestionIndex] || null

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Quiz App - Soru Oluşturucu</h3>
          <button onClick={onClose} className="text-muted text-xl leading-none hover:text-charcoal">×</button>
        </div>

        {/* Question Counter */}
        <div className="px-6 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Soru {currentQuestionIndex + 1} / {questions.length}</span>
            <span className="text-sm text-muted">Toplam {questions.length} soru</span>
          </div>
        </div>

        {/* Question Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Soru Metni *</label>
            <textarea 
              className="input w-full h-20 resize-none"
              placeholder="Örn: Hangi durakta bu soruyu tanımlarsınız?"
              value={currentQuestion?.text || ''}
              onChange={(e) => updateQuestion(currentQuestionIndex, 'text', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Soru Türü *</label>
            <select 
              className="input"
              value={currentQuestion?.type || 'multiple_choice'}
              onChange={(e) => updateQuestion(currentQuestionIndex, 'type', e.target.value)}
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Multiple Choice Options */}
          {currentQuestion?.type === 'multiple_choice' && (
            <div className="space-y-2">
              {(currentQuestion.options || [{ label: '' }]).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder={`Seçenek ${index + 1}`}
                    value={option.label}
                    onChange={(e) => {
                      const newOptions = [...(currentQuestion.options || [])]
                      newOptions[index] = { label: e.target.value }
                      updateQuestion(currentQuestionIndex, 'options', newOptions)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = (currentQuestion.options || []).filter((_, i) => i !== index)
                      updateQuestion(currentQuestionIndex, 'options', newOptions)
                    }}
                    className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Sil
                  </button>
                </div>
              ))}
              <button 
                onClick={() => updateQuestion(currentQuestionIndex, 'options', [...(currentQuestion.options || []), { label: '' }])}
                className="btn-outline btn-sm"
              >
                + Seçenek Ekle
              </button>
            </div>
          )}

          {/* Scale Options */}
          {currentQuestion?.type === 'scale' && (
            <div>
              <label className="label">Puanlama (0-10)</label>
              <input 
                type="number"
                className="input w-20"
                min="0"
                max="10"
                placeholder="5"
                value={typeof currentQuestion.correct_answer === 'number' ? currentQuestion.correct_answer : ''}
                onChange={(e) => updateQuestion(currentQuestionIndex, 'correct_answer', parseInt(e.target.value))}
              />
            </div>
          )}

          {/* True/False Options */}
          {currentQuestion?.type === 'true_false' && (
            <div>
              <label className="label">Doğru Yanlışı</label>
              <select 
                className="input"
                value={typeof currentQuestion.correct_answer === 'string' ? currentQuestion.correct_answer : ''}
                onChange={(e) => updateQuestion(currentQuestionIndex, 'correct_answer', e.target.value)}
              >
                <option value="">Seçiniz</option>
                <option value="true">Doğru</option>
                <option value="false">Yanlış</option>
              </select>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4">
            <button 
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="btn-outline btn-sm"
            >
              ← Önceki
            </button>
            <button 
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="btn-outline btn-sm"
            >
              Sonraki →
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={addQuestion}
              className="btn-primary"
            >
              + Soru Ekle
            </button>
            <button 
              onClick={saveQuestions}
              disabled={questions.length === 0}
              className="btn-outline"
            >
              Kaydet
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Sorular Listesi</h4>
          {questions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">
              Henüz soru eklenmemiş
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div 
                  key={question.id}
                  className={`border rounded-lg p-4 cursor-pointer hover:bg-cream/50 transition-colors ${
                    index === currentQuestionIndex ? 'border-sage-l bg-sage-pale' : 'border-gray-200'
                  }`}
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted">Soru {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${getStatusColor(question.type)}`}>
                        {getStatusLabel(question.type)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {question.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getStatusColor(type: string) {
  switch (type) {
    case 'multiple_choice': return 'text-blue-600'
    case 'text': return 'text-purple-600'
    case 'scale': return 'text-orange-600'
    case 'true_false': return 'text-gray-600'
    default: return 'text-gray-600'
  }
}

function getStatusLabel(type: string) {
  switch (type) {
    case 'multiple_choice': return 'Çoktan Seçmeli'
    case 'text': return 'Metin'
    case 'scale': return 'Ölçekli'
    case 'true_false': return 'Doğru/Yanlış'
    default: return 'Metin'
  }
}
