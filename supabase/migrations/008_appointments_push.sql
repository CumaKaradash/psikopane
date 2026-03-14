-- ============================================================
-- PsikoPanel — Push Subscription & Notify Consent Migration
-- Aşama 3: randevu tablosuna bildirim alanları
-- ============================================================

alter table public.appointments
  add column if not exists push_subscription jsonb,
  add column if not exists notify_consent    boolean default false;

comment on column public.appointments.push_subscription is
  'Web Push PushSubscription JSON — tarayıcı bildirimi için';
comment on column public.appointments.notify_consent is
  'Danışan bildirim almayı kabul etti mi?';
