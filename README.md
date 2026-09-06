# منصتي التعليمية

منصة تعليمية مبنية بـ **Next.js** و **Prisma** مع **PostgreSQL** (مناسب لـ VPS أو أي Postgres عادي).

> **إذا ظهر:** `Environment variable not found: DATABASE_URL` أو فشل تسجيل الدخول — عيّن المتغيرات في `.env` (راجع **ENV_VERCEL.md** و **`.env.example`**).

## التقنيات

- **Next.js 16** (App Router)
- **Prisma** مع PostgreSQL
- **Tailwind CSS 4**
- **TypeScript**

## التشغيل محلياً / على VPS

1. تثبيت الحزم:
   ```bash
   npm install
   ```

2. إعداد قاعدة البيانات:
   - انسخ `.env.example` إلى `.env` وضَع فيه:
     ```
     DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
     ```
     أضف `?sslmode=require` إن كان السيرفر يطلب SSL.
   - على نفس الـ VPS غالباً يكفي `127.0.0.1` أو عنوان الشبكة الداخلية.

3. تطبيق الـ schema وإنشاء الجداول:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
   أو: `npm run db:generate` ثم `npm run db:push`

4. (اختياري) إدخال بيانات تجريبية:
   ```bash
   npm run db:seed
   ```

5. تشغيل المشروع:
   ```bash
   npm run dev
   ```

افتح [http://localhost:3000](http://localhost:3000).

## متغيرات البيئة

| المتغير | القيمة | مطلوب |
|--------|--------|--------|
| `DATABASE_URL` | رابط PostgreSQL (VPS / محلي / أي مزود يدعم بروتوكول Postgres) | نعم |
| `NEXTAUTH_SECRET` | نص عشوائي طويل | نعم |
| `NEXTAUTH_URL` | عنوان الموقع، مثل `http://localhost:3000` أو دومين الإنتاج | نعم |
| `R2_*` | رفع الملفات إلى Cloudflare R2 (اختياري) | لا |

## التحقق

افتح **`/api/health`** — إذا ظهر `"ok": true` و`database.status: "ok"` فالاتصال صحيح.

## أوامر مفيدة

| الأمر | الوصف |
|--------|--------|
| `npm run dev` | تشغيل وضع التطوير |
| `npm run build` | بناء المشروع للإنتاج (`prisma generate` ثم `next build`) |
| `npm run db:generate` | توليد Prisma Client |
| `npm run db:push` | مزامنة الـ schema مع قاعدة البيانات |
| `npm run db:seed` | إدخال البيانات التجريبية |

## هيكل المشروع

- `app/` — صفحات وواجهات API (App Router)
- `components/` — مكونات الواجهة
- `lib/prisma.ts` — عميل Prisma (Singleton)
- `lib/db.ts` — دوال قاعدة البيانات (عبر Prisma)
- `prisma/schema.prisma` — نموذج البيانات
- `prisma/seed.ts` — سكربت البذرة
# NexaClass

## Disposable PostgreSQL migration rehearsal

The rehearsal scripts intentionally reject the normal `DATABASE_URL`. Start the isolated local database with `docker compose -f docker-compose.dev.yml up -d`, then run the scripts with the following values in the shell only:

```powershell
$env:NEXACLASS_REHEARSAL_DATABASE_URL = "postgresql://nexaclass:nexaclass_dev_only@127.0.0.1:55433/nexaclass_rehearsal?schema=public"
$env:NEXACLASS_REHEARSAL_CONFIRM = "RESET_NEXACLASS_REHEARSAL"
npm run test:migration:rehearsal
npm run test:tenant-uniqueness:integration
npm run test:finance:integration
```

This container is development-only. It is safe for the scripts to reset because the guard accepts only loopback databases whose name begins with `nexaclass_rehearsal`.
# Arabic & Quran Academy Demo

Standalone sales-demo tenant for NexaClass, focused on international Arabic and Quran learners.

## Included

- English-first academy landing page with Arabic RTL switcher
- Arabic for Beginners, Quran Reading, Tajweed, and Quran Memorization programs
- Teacher profile, private lessons, live lesson scheduling, assignments, quizzes, and progress
- Mobile responsive layouts for public pages, dashboard, and course experience
- Explicit DEMO seed data separated by tenant slug: `arabic-quran-demo`

## Run locally

1. Copy `.env.example` to `.env` and configure `DATABASE_URL` and `NEXTAUTH_SECRET`.
2. Run `npm install` and `npm run db:push`.
3. Seed the demo with `NEXACLASS_DEMO_SEED=arabic-quran npm run db:seed:arabic-demo`.
4. Prepare demo access with `NEXACLASS_DEMO_SEED=arabic-quran npx tsx scripts/prepare-arabic-demo-access.ts`.
5. Set `NEXACLASS_DEV_TENANT_SLUG=arabic-quran-demo`, then run `npm run dev`.

The demo is intentionally marked as sample content. Replace contact details, teacher profile, course content, meeting links, and imagery before using it for a live academy.
