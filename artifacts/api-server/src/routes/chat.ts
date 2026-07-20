/**
 * /api/chat — نظام المحادثات الحقيقي
 * يدعم ردوداً غير محدودة من الطالب والأستاذ
 */
import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { db } from "@workspace/db";
import { chatMessagesTable, studentsTable } from "@workspace/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

// ── إعداد multer ──────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    // قبول كل الصور بما فيها HEIC و HEIF
    const isImage = file.mimetype.startsWith("image/");
    const isDocs = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ].includes(file.mimetype);
    cb(null, isImage || isDocs);
  },
});

// ── رفع ملف/صورة ─────────────────────────────────────────────
router.post("/chat/upload", upload.single("file"), (req, res): void => {
  if (!req.file) {
    // إذا رُفضت من fileFilter، نقبله كـ binary وننزّله
    res.status(400).json({ error: "نوع الملف غير مدعوم أو الملف فارغ" });
    return;
  }
  const isImage = req.file.mimetype.startsWith("image/");
  const domain = process.env["REPLIT_DEV_DOMAIN"] ?? "localhost";
  const protocol = domain.includes("localhost") ? "http" : "https";
  const url = `${protocol}://${domain}/api/uploads/${req.file.filename}`;
  res.json({
    url,
    type: isImage ? "image" : "file",
    name: req.file.originalname,
  });
});

// ── جلب رسائل محادثة ─────────────────────────────────────────
router.get("/chat/:studentId/:teacherId", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  const teacherId = parseInt(req.params.teacherId, 10);

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.studentId, studentId),
        eq(chatMessagesTable.teacherId, teacherId),
      ),
    )
    .orderBy(asc(chatMessagesTable.createdAt));

  // تمييز رسائل الطالب كمقروءة (الأستاذ يقرأ)
  await db
    .update(chatMessagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(chatMessagesTable.studentId, studentId),
        eq(chatMessagesTable.teacherId, teacherId),
        eq(chatMessagesTable.senderType, "student"),
        eq(chatMessagesTable.isRead, false),
      ),
    );

  res.json(messages);
});

// ── إرسال رسالة ──────────────────────────────────────────────
router.post("/chat/message", async (req, res): Promise<void> => {
  const {
    studentId, teacherId, senderType, senderName,
    text, attachmentUrl, attachmentType, attachmentName,
  } = req.body ?? {};

  if (!studentId || !teacherId || !senderType) {
    res.status(400).json({ error: "studentId, teacherId, senderType مطلوبة" });
    return;
  }
  if (!text?.trim() && !attachmentUrl) {
    res.status(400).json({ error: "يجب إرسال نص أو مرفق" });
    return;
  }

  const [msg] = await db
    .insert(chatMessagesTable)
    .values({
      studentId: Number(studentId),
      teacherId: Number(teacherId),
      senderType,
      senderName: senderName ?? null,
      text: text?.trim() ?? null,
      attachmentUrl: attachmentUrl ?? null,
      attachmentType: attachmentType ?? null,
      attachmentName: attachmentName ?? null,
      isRead: false,
    })
    .returning();

  res.status(201).json(msg);
});

// ── تمييز المحادثة كمقروءة ───────────────────────────────────
router.patch("/chat/:studentId/:teacherId/read", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  const teacherId = parseInt(req.params.teacherId, 10);
  const { readerType } = req.body ?? {};

  // الأستاذ يقرأ: علّم رسائل الطالب
  // الطالب يقرأ: علّم رسائل الأستاذ والمساعد
  const senderToMark = readerType === "teacher" ? "student" : "teacher";

  await db
    .update(chatMessagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(chatMessagesTable.studentId, studentId),
        eq(chatMessagesTable.teacherId, teacherId),
        eq(chatMessagesTable.senderType, senderToMark),
        eq(chatMessagesTable.isRead, false),
      ),
    );

  res.json({ ok: true });
});

// ── قائمة المحادثات للأستاذ (inbox) ─────────────────────────
router.get("/chat/teacher/:teacherId/conversations", async (req, res): Promise<void> => {
  const teacherId = parseInt(req.params.teacherId, 10);

  // آخر رسالة لكل طالب
  const rows = await db
    .select({
      studentId: chatMessagesTable.studentId,
      studentName: studentsTable.fullName,
      lastMessage: chatMessagesTable.text,
      lastTime: chatMessagesTable.createdAt,
      lastSenderType: chatMessagesTable.senderType,
      isRead: chatMessagesTable.isRead,
    })
    .from(chatMessagesTable)
    .leftJoin(studentsTable, eq(chatMessagesTable.studentId, studentsTable.id))
    .where(eq(chatMessagesTable.teacherId, teacherId))
    .orderBy(desc(chatMessagesTable.createdAt));

  // تجميع حسب الطالب — أحدث رسالة + عدد غير المقروءة
  const map = new Map<number, {
    studentId: number;
    studentName: string;
    lastMessage: string;
    lastTime: string;
    unreadCount: number;
    lastSenderType: string;
  }>();

  for (const row of rows) {
    const existing = map.get(row.studentId);
    const isUnread = !row.isRead && row.lastSenderType === "student";
    if (!existing) {
      map.set(row.studentId, {
        studentId: row.studentId,
        studentName: row.studentName ?? `طالب #${row.studentId}`,
        lastMessage: row.lastMessage ?? "📎 مرفق",
        lastTime: row.lastTime.toISOString(),
        unreadCount: isUnread ? 1 : 0,
        lastSenderType: row.lastSenderType,
      });
    } else {
      if (isUnread) existing.unreadCount++;
    }
  }

  res.json(Array.from(map.values()));
});

export default router;
