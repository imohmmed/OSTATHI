/**
 * /api/upload — رفع الفيديوهات بتقنية Chunked Upload
 *
 * POST /upload/video/chunk   — استقبال جزء واحد (base64 JSON)
 * POST /upload/video/complete — تجميع الأجزاء وإرجاع رابط الفيديو
 * DELETE /upload/video/cancel/:uploadId — إلغاء وحذف الأجزاء المؤقتة
 */
import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

// ── مجلدات التخزين ────────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), "uploads");
const chunksDir  = path.join(uploadsDir, "chunks");
const videosDir  = path.join(uploadsDir, "videos");

[chunksDir, videosDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── صلاحيات uploadId ─────────────────────────────────────────────────
function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(id);
}

function buildUrl(domain: string, filename: string): string {
  const protocol = domain.includes("localhost") ? "http" : "https";
  return `${protocol}://${domain}/api/uploads/videos/${filename}`;
}

// ── POST /upload/video/chunk ──────────────────────────────────────────
// Body: { uploadId, chunkIndex, totalChunks, data (base64) }
router.post("/upload/video/chunk", (req, res): void => {
  const { uploadId, chunkIndex, data } = req.body as {
    uploadId: string;
    chunkIndex: number;
    totalChunks: number;
    data: string;
  };

  if (!uploadId || chunkIndex === undefined || !data) {
    res.status(400).json({ error: "بيانات ناقصة: uploadId أو chunkIndex أو data" });
    return;
  }
  if (!isValidId(uploadId)) {
    res.status(400).json({ error: "uploadId غير صالح" });
    return;
  }

  const uploadDir = path.join(chunksDir, uploadId);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const chunkPath = path.join(uploadDir, `chunk_${chunkIndex}.bin`);
  const buffer = Buffer.from(data, "base64");
  fs.writeFileSync(chunkPath, buffer);

  res.json({ ok: true, chunkIndex });
});

// ── POST /upload/video/complete ───────────────────────────────────────
// Body: { uploadId, totalChunks, filename }
router.post("/upload/video/complete", async (req, res): Promise<void> => {
  const { uploadId, totalChunks, filename } = req.body as {
    uploadId: string;
    totalChunks: number;
    filename: string;
  };

  if (!uploadId || !totalChunks || !filename) {
    res.status(400).json({ error: "بيانات ناقصة" });
    return;
  }
  if (!isValidId(uploadId)) {
    res.status(400).json({ error: "uploadId غير صالح" });
    return;
  }

  const uploadDir = path.join(chunksDir, uploadId);

  // تحقق من وجود كل الأجزاء
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(uploadDir, `chunk_${i}.bin`);
    if (!fs.existsSync(chunkPath)) {
      res.status(400).json({ error: `الجزء ${i} مفقود` });
      return;
    }
  }

  // امتداد آمن
  const ext = path.extname(filename).toLowerCase();
  const safeExt = [".mp4", ".m4v", ".mov", ".avi", ".mkv", ".webm"].includes(ext)
    ? ext
    : ".mp4";
  const finalName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
  const finalPath = path.join(videosDir, finalName);

  try {
    // تجميع الأجزاء
    await new Promise<void>((resolve, reject) => {
      const ws = fs.createWriteStream(finalPath);
      ws.on("finish", resolve);
      ws.on("error", reject);
      for (let i = 0; i < totalChunks; i++) {
        const chunk = fs.readFileSync(path.join(uploadDir, `chunk_${i}.bin`));
        ws.write(chunk);
      }
      ws.end();
    });
  } catch (err) {
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    res.status(500).json({ error: "فشل تجميع الملف" });
    return;
  }

  // حذف الأجزاء المؤقتة
  fs.rmSync(uploadDir, { recursive: true, force: true });

  const domain = process.env["REPLIT_DEV_DOMAIN"] ?? "localhost";
  const url = buildUrl(domain, finalName);

  res.json({ url, filename: finalName });
});

// ── DELETE /upload/video/cancel/:uploadId ────────────────────────────
router.delete("/upload/video/cancel/:uploadId", (req, res): void => {
  const { uploadId } = req.params;
  if (!isValidId(uploadId)) {
    res.status(400).json({ error: "uploadId غير صالح" });
    return;
  }
  const uploadDir = path.join(chunksDir, uploadId);
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
  res.json({ ok: true });
});

export default router;
