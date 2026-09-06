# متغيرات البيئة — النشر (VPS أو أي استضافة) وقاعدة PostgreSQL عبر Prisma

إذا ظهر الخطأ: **`Environment variable not found: DATABASE_URL`** أو فشل تسجيل الدخول/إنشاء الحساب، يجب تعيين المتغيرات التالية.

## المتغيرات المطلوبة

| Key | Value |
|-----|--------|
| **DATABASE_URL** | رابط PostgreSQL على الـ VPS (أو محلياً). مثال: `postgresql://user:password@127.0.0.1:5432/dbname` أو مع SSL: `...?sslmode=require` |
| **NEXTAUTH_SECRET** | نص عشوائي طويل (مثلاً 32 حرفاً) |
| **NEXTAUTH_URL** | عنوان الموقع بالضبط، مثل: `https://your-domain.com` أو `http://localhost:3000` للتطوير |

راجع أيضاً [`.env.example`](.env.example).

## إعداد قاعدة البيانات (Prisma)

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
```

أو: `npm run db:generate` / `npm run db:push` / `npm run db:seed`.

## ملاحظات

- **DATABASE_URL** يجب أن يشير إلى PostgreSQL يدعم بروتوكول Postgres العادي (VPS، Docker، محلي). عميل Neon HTTP غير مستخدم.
- بعد تغيير المتغيرات على السيرفر أعد تشغيل التطبيق.

## التحقق

افتح `/api/health` — إذا ظهر `"ok": true` و `"database": { "status": "ok" }` فالاتصال صحيح.
