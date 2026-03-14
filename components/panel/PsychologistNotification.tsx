'use client'
// components/panel/PsychologistNotification.tsx

import { useState } from 'react'
import { CheckCircle, X, Mail, Send } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  testName: string
  testScore: number
  respondentName: string
  completedAt: string
  onSendEmail: () => void
  onSendWhatsApp: () => void
}

export default function PsychologistNotification({ isOpen, onClose, testName, testScore, respondentName, completedAt, onSendEmail, onSendWhatsApp }: Props) {
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsApp] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSendEmail = async () => {
    if (!email) {
      toast.error('E-posta adresi girin')
      return
    }
    setSending(true)
    try {
      // Email gönderme işlemi
      onSendEmail()
      setSent(true)
      toast.success('Bildirim gönderildi!')
      setEmail('')
    } catch (error) {
      toast.error('Bildirim gönderilemedi')
    } finally {
      setSending(false)
    }
  }

  const handleWhatsApp = async () => {
    if (!whatsapp) {
      toast.error('WhatsApp numarası girin')
      return
    }
    setSending(true)
    try {
      // WhatsApp gönderme işlemi
      onSendWhatsApp()
      setSent(true)
      toast.success('WhatsApp ile bildirildi!')
      setWhatsApp('')
    } catch (error) {
      toast.error('WhatsApp gönderilemedi')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-green-800">Test Tamamlandı!</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-muted text-xl leading-none hover:text-charcoal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-sage-pale border-4 border-sage flex flex-col items-center justify-center mx-auto mb-6">
              <span className="text-3xl text-sage">✓</span>
              <span className="text-[10px] text-sage font-bold uppercase tracking-wide">Tamamlandı</span>
            </div>
            <h2 className="font-serif text-2xl mb-2">Test Tamamlandı</h2>
            <p className="text-sm text-muted mb-6">Sonuçlarınız psikologunuza iletildi.</p>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Bildirim</div>
              <div className="text-lg font-semibold text-green-800">Psikologunuza iletildi</div>
            </div>
          </div>

          {/* Notification Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent border-0 focus:outline-none text-sm"
              />
            </div>
            <button
              onClick={handleSendEmail}
              disabled={sending || sent}
              className="btn-primary flex-1 justify-center disabled:opacity-40"
            >
              {sending ? 'Gönderiliyor...' : sent ? 'Gönderildi ✓' : 'E-posta Gönder'}
            </button>
            <button
              onClick={handleWhatsApp}
              disabled={sending || sent}
              className="btn-primary flex-1 justify-center disabled:opacity-40 bg-green-600 hover:bg-green-700 border-green-600"
            >
              {sending ? 'Gönderiliyor...' : sent ? 'Gönderildi ✓' : 'WhatsApp Gönder'}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button 
              onClick={() => {
                // Danışan sayfasına yönlendir
                if (respondentName) {
                  window.location.href = `/panel/clients?search=${encodeURIComponent(respondentName)}`
                }
              }}
              className="btn-outline flex-1 justify-center"
            >
              Danışan Sayfası →
            </button>
            <button 
              onClick={() => {
                // Test sonuç sayfasına yönlendir
                window.location.href = `/panel/archive?test=${testName}`
              }}
              className="btn-outline flex-1 justify-center"
            >
              Test Sonuçları →
            </button>
          </div>

          {/* Success Message */}
          {sent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Bildirim gönderildi!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
