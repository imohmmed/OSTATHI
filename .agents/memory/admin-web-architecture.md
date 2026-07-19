---
name: Admin Web Architecture
description: Session management, detail pages, and API patterns for the web admin (ustadhi-web)
---

# Admin Session Management
- `setAuthTokenGetter(() => localStorage.getItem('admin_session'))` called at App.tsx module level (persists across page refreshes)
- On login success: `setAdminSession(data.sessionId)` stores to localStorage, then re-calls `setAuthTokenGetter`
- On logout: `clearAdminSession()` + `setAuthTokenGetter(null)`
- `requireAdmin` in api-server now accepts BOTH `x-session-id` header AND `Authorization: Bearer <sessionId>`
- Sessions are in-memory; restart of api-server invalidates all sessions (users must re-login)

# New Detail Pages (web admin)
- `/admin/teachers/:id` → `teacher-detail.tsx`: wide 16:9 banner image (صورة عرضية), edit dialog, courses+students tabs
- `/admin/subjects/:id` → `subject-detail.tsx`: stats, teacher grid (banner style), + add teacher dialog (creates teacher with subject pre-assigned)
- `/admin/students/:id` → `student-detail.tsx`: profile, enrolled courses, add guardian dialog
- `/admin/settings` → `settings.tsx`: change password (POST /api/admin/change-password), theme toggle, logout

# API additions
- `GET /subjects/:id` now returns: subject + teachers[] (with gradeLevels) + teachersCount + coursesCount + studentsCount
- `POST /admin/change-password` (requires auth): { currentPassword, newPassword }
- `adminFetch` utility at `src/lib/admin-fetch.ts` — wraps fetch with Authorization: Bearer header

**Why:** customFetch (api-client-react) sends Authorization Bearer, but requireAdmin only checked x-session-id → admin-only routes (GET /students, etc.) returned 401 silently. Fixed by accepting both headers.
