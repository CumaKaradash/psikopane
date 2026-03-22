'use client'

import { useState } from 'react'
import { MessageSquare, Send, CheckCircle } from 'lucide-react'

interface FeedbackData {
  type: 'bug' | 'feature' | 'general' | 'other'
  subject: string
  message: string
  email?: string
}

export default function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState<FeedbackData>({
    type: 'general',
    subject: '',
    message: '',
    email: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Geri bildirim gönderilemedi')
      }

      setIsSubmitted(true)
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false)
        setFormData({
          type: 'general',
          subject: '',
          message: '',
          email: ''
        })
      }, 3000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      // Show error message to user
      alert(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FeedbackData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Geri Bildiriminiz İçin Teşekkürler!</h3>
        <p className="text-gray-600">Geri bildiriminiz bizim için değerli. En kısa sürede değerlendirilecektir.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Geri Bildirim</h2>
            <p className="text-sm text-gray-600">Görüşlerinizi bizimle paylaşın</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Geri Bildirim Türü
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'bug', label: 'Hata Bildirimi' },
                { value: 'feature', label: 'Özellik İsteği' },
                { value: 'general', label: 'Genel Görüş' },
                { value: 'other', label: 'Diğer' }
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleInputChange('type', type.value as FeedbackData['type'])}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    formData.type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Konu
            </label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Geri bildiriminizin konusu"
              required
            />
          </div>

          {/* Email (Optional) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-posta (İsteğe Bağlı)
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="ornek@email.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Geri bildiriminiz hakkında size ulaşmamız gerektiğinde kullanılır
            </p>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Mesajınız
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
              placeholder="Detaylı geri bildiriminizi buraya yazabilirsiniz..."
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Geri Bildirim Gönder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
