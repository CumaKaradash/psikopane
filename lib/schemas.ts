// lib/schemas.ts — Merkezi Zod şema tanımları
// Hem API route'larında hem istemci form validasyonunda kullanılır

import { z } from 'zod'

// ── Randevu (public booking) ──────────────────────────────────────────────────
export const BookingSchema = z.object({
  psychologist_id: z.string().uuid('Geçersiz psikolog ID'),
  guest_name:      z.string().min(2, 'Ad en az 2 karakter olmalı').max(100),
  guest_phone:     z.string().min(10, 'Geçerli bir telefon numarası girin').max(20),
  guest_email:     z.string().email('Geçerli bir e-posta adresi girin'),
  guest_note:      z.string().max(500).optional().nullable(),
  session_type:    z.string().min(1).max(100),
  starts_at:       z.string().datetime({ offset: true, message: 'Geçerli bir tarih girin' }),
  duration_min:    z.number().int().min(15).max(240).optional().default(50),
  notify_consent:  z.boolean().optional().default(false),
  push_subscription: z.string().optional().nullable(),
})

// ── Panel randevu ekleme ──────────────────────────────────────────────────────
export const PanelAppointmentSchema = z.object({
  guest_name:   z.string().min(2).max(100),
  guest_phone:  z.string().max(20).optional().nullable(),
  guest_email:  z.string().email().optional().nullable().or(z.literal('')),
  guest_note:   z.string().max(500).optional().nullable(),
  session_type: z.string().min(1).max(100),
  starts_at:    z.string().datetime({ offset: true }),
  duration_min: z.number().int().min(15).max(240).optional().default(50),
  notes:        z.string().max(1000).optional().nullable(),
  _panel_add:   z.literal(true),
})

// ── Danışan ──────────────────────────────────────────────────────────────────
export const ClientSchema = z.object({
  full_name:    z.string().min(2, 'Ad en az 2 karakter olmalı').max(100),
  phone:        z.string().max(20).optional().nullable(),
  email:        z.string().email().optional().nullable().or(z.literal('')),
  birth_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  address:      z.string().max(200).optional().nullable(),
  session_type: z.string().max(100).optional().nullable(),
  notes:        z.string().max(2000).optional().nullable(),
})

// ── Finans kaydı ──────────────────────────────────────────────────────────────
export const FinanceEntrySchema = z.object({
  type:           z.enum(['income', 'expense']),
  amount:         z.number().positive('Tutar pozitif olmalı').max(1_000_000),
  description:    z.string().min(1, 'Açıklama zorunlu').max(200),
  entry_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  appointment_id: z.string().uuid().optional().nullable(),
})

// ── Profil ────────────────────────────────────────────────────────────────────
export const ProfileSchema = z.object({
  full_name:     z.string().min(2).max(100).optional(),
  title:         z.string().max(100).optional(),
  email:         z.string().email().optional().nullable(),
  bio:           z.string().max(1000).optional().nullable(),
  slug:          z.string().regex(/^[a-z0-9-]+$/, 'Sadece küçük harf, rakam ve tire').min(3).max(60).optional(),
  avatar_url:    z.string().url().startsWith('https://').optional().nullable().or(z.literal('')),
  session_types: z.array(z.string().max(100)).max(20).optional(),
  session_price: z.number().int().min(0).max(100_000).optional(),
  phone:         z.string().max(20).optional().nullable(),
})

// ── Seans notu ────────────────────────────────────────────────────────────────
export const SessionNoteSchema = z.object({
  appointment_id: z.string().uuid(),
  content:        z.string().max(10_000),
})
