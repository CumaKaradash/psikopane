# PsikoPanel

Psikologlar için pratik yönetim sistemi.

## Kurulum

```bash
npm install
```

`.env.local` dosyası oluşturun:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Veritabanı

Supabase SQL Editor'da şu sırayla çalıştırın:

**1. Temizle (varsa):**
```sql
drop table if exists public.finance_entries    cascade;
drop table if exists public.homework_responses cascade;
drop table if exists public.homework           cascade;
drop table if exists public.test_responses     cascade;
drop table if exists public.tests              cascade;
drop table if exists public.appointments       cascade;
drop table if exists public.clients            cascade;
drop table if exists public.profiles           cascade;
```

**2. Şemayı oluştur:** `supabase/migrations/001_init.sql` dosyasını çalıştırın.

## Geliştirme

```bash
npm run dev
```

## URL Yapısı

| URL | Açıklama |
|-----|----------|
| `/auth/login` | Psikolog girişi |
| `/auth/register` | Yeni hesap |
| `/panel` | Dashboard |
| `/panel/calendar` | Takvim |
| `/panel/clients` | Danışanlar |
| `/panel/tests` | Test yönetimi |
| `/panel/homework` | Ödev yönetimi |
| `/panel/links` | Link paylaş |
| `/panel/finance` | Muhasebe |
| `/panel/archive` | Arşiv |
| `/panel/network` | Meslektaş Ağı & Takımlar |
| `/panel/community` | Topluluk Test Havuzu |
| `/panel/news` | Psikoloji Haber Bülteni |
| `/{slug}/booking` | Herkese açık randevu formu |
| `/{slug}/test/{testId}` | Herkese açık test |
| `/{slug}/odev/{odevId}` | Herkese açık ödev |

## Deployment (Vercel)

Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
