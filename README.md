# PsikoPanel

Psikologlar için kapsamlı klinik yönetim ve ağ platformu.

**Stack:** Next.js 16 · Supabase · Tailwind CSS · TypeScript · Vercel

---

## 🚀 Vercel'e Deploy

### 1. Repository

```bash
git init && git add . && git commit -m "initial"
gh repo create psikopanel --private --push
```

### 2. Vercel

1. [vercel.com](https://vercel.com) → **New Project** → GitHub repo'yu bağla
2. **Framework Preset:** Next.js (otomatik)
3. **Root Directory:** `/` (değiştirme)

### 3. Environment Variables

Vercel → Project → Settings → **Environment Variables** altına ekle:

| Değişken | Açıklama | Zorunlu |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | ✅ |
| `NEXT_PUBLIC_APP_URL` | Uygulamanın URL'i | ✅ |
| `RESEND_API_KEY` | E-posta bildirimleri | Önerilen |
| `RESEND_FROM_EMAIL` | Gönderici e-posta | Önerilen |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push bildirimleri | Opsiyonel |
| `VAPID_PRIVATE_KEY` | Push bildirimleri | Opsiyonel |
| `VAPID_SUBJECT` | Push bildirimleri | Opsiyonel |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Opsiyonel |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Opsiyonel |
| `CRON_SECRET` | Cron güvenliği | Önerilen |

> VAPID anahtarı üretmek için: `npx web-push generate-vapid-keys`

### 4. Supabase Veritabanı

Supabase **SQL Editor**'da migration'ları sırayla çalıştırın:

```
supabase/migrations/001_init.sql
supabase/migrations/007_security_hardening.sql
supabase/migrations/008_appointments_push.sql
supabase/migrations/009_teams_and_network.sql
supabase/migrations/010_public_tests.sql
supabase/migrations/011_team_slugs.sql
```

> **Not:** 002–006 dosyaları eski geliştirme aşamalarına aittir, 007 onları kapsar.

### 5. Deploy

```bash
git push origin main
# Vercel otomatik build + deploy başlatır
```

---

## 💻 Yerel Geliştirme

```bash
cp .env.example .env.local
# .env.local içindeki değerleri doldur

npm install
npm run dev
# → http://localhost:3000
```

---

## 📁 URL Yapısı

| URL | Açıklama | Auth |
|---|---|---|
| `/` | Giriş sayfasına yönlendirir | — |
| `/auth/login` | Psikolog girişi | — |
| `/auth/register` | Yeni hesap oluştur | — |
| `/auth/setup` | Profil kurulumu | ✅ |
| `/panel` | Dashboard | ✅ |
| `/panel/calendar` | Takvim | ✅ |
| `/panel/clients` | Danışanlar | ✅ |
| `/panel/tests` | Test yönetimi | ✅ |
| `/panel/homework` | Ödev yönetimi | ✅ |
| `/panel/finance` | Muhasebe | ✅ |
| `/panel/archive` | Arşiv | ✅ |
| `/panel/links` | Link paylaş | ✅ |
| `/panel/network` | Meslektaş ağı | ✅ |
| `/panel/community` | Topluluk testleri | ✅ |
| `/panel/news` | Psikoloji bülteni | ✅ |
| `/panel/settings` | Profil ayarları | ✅ |
| `/{slug}` | Psikolog/klinik vitrin sayfası | — |
| `/{slug}/booking` | Randevu formu | — |
| `/{slug}/test/{id}` | Test formu | — |
| `/{slug}/odev/{id}` | Ödev formu | — |

---

## 🔧 Cron Job

`vercel.json`'da tanımlı — her gün 06:00 UTC (09:00 TR):

```
POST /api/cron/reminders
Authorization: Bearer {CRON_SECRET}
```

Yaklaşan randevuları bulur → Resend ile e-posta + Web Push bildirimi gönderir.

---

## 🗄️ Veritabanı Tabloları

`profiles` · `clients` · `appointments` · `tests` · `test_responses`  
`homework` · `homework_responses` · `finance_entries` · `files`  
`teams` · `team_members` · `connections`
