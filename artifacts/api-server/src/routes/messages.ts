import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { db } from "@workspace/db";
import { messagesTable, studentsTable, teachersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

// ── إعداد multer لرفع الملفات ─────────────────────────
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const isHeic = HEIC_TYPES.includes(file.mimetype) ||
      /\.(heic|heif)$/i.test(file.originalname);
    // HEIC files will be converted → save with .jpg extension
    const ext = isHeic ? ".jpg" : path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", ...HEIC_TYPES];
    const isHeicByExt = /\.(heic|heif)$/i.test(file.originalname);
    cb(null, allowed.includes(file.mimetype) || isHeicByExt);
  },
});

// ── تحويل HEIC → JPEG بعد الرفع ──────────────────────
async function convertHeicIfNeeded(file: Express.Multer.File): Promise<void> {
  const isHeic = HEIC_TYPES.includes(file.mimetype) ||
    /\.(heic|heif)$/i.test(file.originalname);
  if (!isHeic) return;
  const filePath = file.path;
  // sharp reads HEIC natively (via libheif) and outputs JPEG
  const jpgBuf = await sharp(filePath).jpeg({ quality: 88 }).toBuffer();
  fs.writeFileSync(filePath, jpgBuf);
  file.mimetype = "image/jpeg";
}

// ── رفع ملف/صورة ──────────────────────────────────────
router.post("/messages/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "لم يتم رفع أي ملف" });
    return;
  }
  try {
    await convertHeicIfNeeded(req.file);
  } catch {
    // إذا فشل التحويل نكمل بالملف الأصلي
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

// ── يرسل طالب رسالة للأستاذ ───────────────────────────
router.post("/messages", async (req, res): Promise<void> => {
  const { fromStudentId, toTeacherId, text, attachmentUrl, attachmentType, attachmentName } = req.body ?? {};
  if (!fromStudentId || !toTeacherId || !text?.trim()) {
    res.status(400).json({ error: "fromStudentId, toTeacherId, and text are required" });
    return;
  }
  const [msg] = await db
    .insert(messagesTable)
    .values({
      fromStudentId: Number(fromStudentId),
      toTeacherId: Number(toTeacherId),
      text: text.trim(),
      attachmentUrl: attachmentUrl ?? null,
      attachmentType: attachmentType ?? null,
      attachmentName: attachmentName ?? null,
    })
    .returning();
  res.status(201).json(msg);
});

// ── صندوق الوارد للأستاذ ─────────────────────────────
router.get("/messages/teacher/:teacherId", async (req, res): Promise<void> => {
  const teacherId = parseInt(req.params.teacherId, 10);
  const messages = await db
    .select({
      id: messagesTable.id,
      fromStudentId: messagesTable.fromStudentId,
      studentName: studentsTable.fullName,
      toTeacherId: messagesTable.toTeacherId,
      text: messagesTable.text,
      attachmentUrl: messagesTable.attachmentUrl,
      attachmentType: messagesTable.attachmentType,
      attachmentName: messagesTable.attachmentName,
      replyText: messagesTable.replyText,
      replyAttachmentUrl: messagesTable.replyAttachmentUrl,
      replyAttachmentType: messagesTable.replyAttachmentType,
      replyAttachmentName: messagesTable.replyAttachmentName,
      replierType: messagesTable.replierType,
      replierName: messagesTable.replierName,
      repliedAt: messagesTable.repliedAt,
      isReadByTeacher: messagesTable.isReadByTeacher,
      isReadByStudent: messagesTable.isReadByStudent,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .leftJoin(studentsTable, eq(messagesTable.fromStudentId, studentsTable.id))
    .where(eq(messagesTable.toTeacherId, teacherId))
    .orderBy(desc(messagesTable.createdAt));
  res.json(messages);
});

// ── المحادثة بين طالب وأستاذ ─────────────────────────
router.get("/messages/student/:studentId/teacher/:teacherId", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  const teacherId = parseInt(req.params.teacherId, 10);
  const messages = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.fromStudentId, studentId), eq(messagesTable.toTeacherId, teacherId)))
    .orderBy(desc(messagesTable.createdAt));
  // تمييز الرسائل كمقروءة عند جلبها
  await db
    .update(messagesTable)
    .set({ isReadByTeacher: true })
    .where(and(eq(messagesTable.fromStudentId, studentId), eq(messagesTable.toTeacherId, teacherId)));
  res.json(messages);
});

// ── رد على رسالة (أستاذ أو مساعد) ───────────────────
router.patch("/messages/:id/reply", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { replyText, replierType, replierName, replyAttachmentUrl, replyAttachmentType, replyAttachmentName } = req.body ?? {};
  if (!replyText?.trim()) {
    res.status(400).json({ error: "replyText required" });
    return;
  }
  const [msg] = await db
    .update(messagesTable)
    .set({
      replyText: replyText.trim(),
      replierType: replierType ?? "teacher",
      replierName: replierName ?? null,
      replyAttachmentUrl: replyAttachmentUrl ?? null,
      replyAttachmentType: replyAttachmentType ?? null,
      replyAttachmentName: replyAttachmentName ?? null,
      repliedAt: new Date(),
      isReadByStudent: false,
    })
    .where(eq(messagesTable.id, id))
    .returning();
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(msg);
});

// ── تمييز محادثة كمقروءة من قبل الطالب ──────────────
router.patch("/messages/student/:studentId/teacher/:teacherId/read", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  const teacherId = parseInt(req.params.teacherId, 10);
  await db
    .update(messagesTable)
    .set({ isReadByStudent: true })
    .where(and(eq(messagesTable.fromStudentId, studentId), eq(messagesTable.toTeacherId, teacherId)));
  res.json({ ok: true });
});

// ── عدد الرسائل غير المقروءة للأستاذ ────────────────
router.get("/messages/teacher/:teacherId/unread-count", async (req, res): Promise<void> => {
  const teacherId = parseInt(req.params.teacherId, 10);
  const unread = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.toTeacherId, teacherId), eq(messagesTable.isReadByTeacher, false)));
  res.json({ count: unread.length });
});

export default router;
