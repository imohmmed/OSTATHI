# الرؤية الذهبية

موقع إلكتروني لمنصة تعليمية عراقية متكاملة — واجهة عامة + لوحة تحكم للمدير فقط.

## Run & Operate

- `pnpm --filter @workspace/ustadhi-web run dev` — تشغيل الموقع (port 23567)
- `pnpm --filter @workspace/api-server run dev` — تشغيل خادم API (port 8080)
- `pnpm run typecheck` — فحص الأنواع لجميع الحزم
- `pnpm run build` — بناء جميع الحزم
- `pnpm --filter @workspace/api-spec run codegen` — إعادة توليد hooks و Zod schemas
- `pnpm --filter @workspace/db run push` — تطبيق تغييرات قاعدة البيانات

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter + framer-motion
- API: Express 5 + Zod validation
- DB: PostgreSQL + Drizzle ORM
- Codegen: Orval (from OpenAPI spec)
- Font: Tajawal (Arabic Google Font)
- RTL: كامل الموقع بالعربية مع dir="rtl"

## Where things live

- `artifacts/ustadhi-web/` — الواجهة الأمامية (React + Vite)
- `artifacts/api-server/` — خادم API (Express 5)
- `lib/api-spec/openapi.yaml` — مواصفة API (مصدر الحقيقة)
- `lib/db/src/schema/` — مخطط قاعدة البيانات (Drizzle)
- `lib/api-client-react/` — React Query hooks (مولّد تلقائياً)
- `lib/api-zod/` — Zod schemas (مولّد تلقائياً)

## Admin Authentication

- Username/Password متغيرات بيئة: `ADMIN_USERNAME` و `ADMIN_PASSWORD`
- القيم الافتراضية: `admin` / `admin123`
- Session-based (in-memory, X-Session-Id header)

## Pages

### Landing Page (عامة)
- `/` — الصفحة الرئيسية: hero, مواد, أساتذة, دورات, آراء, سوشيال ميديا

### Admin Dashboard (مدير فقط)
- `/admin/login` — تسجيل الدخول
- `/admin` — لوحة التحكم (إحصائيات)
- `/admin/students` — إدارة الطلاب
- `/admin/teachers` — إدارة الأساتذة
- `/admin/assistants` — إدارة المساعدين
- `/admin/parents` — إدارة أولياء الأمور
- `/admin/subjects` — إدارة المواد
- `/admin/courses` — إدارة الدورات
- `/admin/courses/:id` — محتوى الدورة (محاضرات + اختبارات)
- `/admin/reviews` — إدارة التقييمات
- `/admin/livestreams` — إدارة البث المباشر
- `/admin/notifications` — إرسال الإشعارات

## Architecture decisions

- Admin auth is simple session-based (no JWT) since there's only one admin
- Public endpoints (subjects, courses, reviews, teachers GET) don't require auth — needed for landing page
- All protected endpoints require `X-Session-Id` header
- Passwords stored as plaintext (educational context, can be hashed later)
- RTL enforced globally via `dir="rtl"` on `<html>` tag

## User preferences

- اللغة: عربية فقط في الواجهة
- الألوان: وضع فاتح (#FFFFFF خلفية, #000 نص, #101D36 ثانوي) / وضع داكن (#101D36 خلفية, أبيض نص)
- لا يوجد رموز تعبيرية في الواجهة
- اسم المنصة: الرؤية الذهبية
- الموقع للمدير فقط — حسابات الطلاب/الأساتذة/المساعدين/الأولياء تُنشأ من الداشبورد

## Gotchas

- بعد كل تعديل على `lib/api-spec/openapi.yaml`، شغّل codegen قبل استخدام الـ hooks
- خادم API يحتاج إعادة بناء (`pnpm run build`) بعد تعديل الكود
- `requireAdmin` middleware يتحقق من header `X-Session-Id`
- الصفحة الرئيسية (landing) تستدعي بعض endpoints بدون auth (subjects, courses, reviews, teachers)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
