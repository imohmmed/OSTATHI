---
name: Messages backend
description: Student-to-teacher messaging system — DB table, API routes, mobile usage
---

## Schema
`messagesTable`: fromStudentId (ref students), toTeacherId (ref teachers), text, replyText, repliedAt, isReadByTeacher, isReadByStudent, createdAt

## API routes (all in /api/messages*)
- POST /messages — student sends { fromStudentId, toTeacherId, text }
- GET /messages/teacher/:teacherId — teacher inbox; auto-marks as read
- GET /messages/student/:studentId/teacher/:teacherId — conversation thread; marks isReadByTeacher
- PATCH /messages/:id/reply — { replyText }; teacher replies
- GET /messages/teacher/:teacherId/unread-count — badge count
- PATCH /messages/student/:s/teacher/:t/read — marks isReadByStudent

## Mobile usage
- Student chat tab: POST to send, GET /student/.../teacher/... for conversation
- Teacher communication tab: GET /teacher/... for inbox grouped by student; PATCH to reply

**Why:** AsyncStorage-only messages were device-local; teacher could never see student messages. DB-backed allows two-way async communication.

**How to apply:** No JWT auth yet — trust client-provided IDs. Add auth header verification when JWT is implemented.
