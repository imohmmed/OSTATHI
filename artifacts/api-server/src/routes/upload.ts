/**
 * /api/upload — رفع الفيديوهات بتقنية Chunked Upload → DigitalOcean Spaces
 *
 * POST   /upload/video/chunk          — استقبال جزء واحد (base64 JSON)
 * POST   /upload/video/complete       — تجميع الأجزاء ورفعها إلى Spaces
 * DELETE /upload/video/cancel/:id     — إلغاء وحذف الأجزاء المؤقتة
 * GET    /upload/video/stream/:key    — توليد Signed URL مؤقت وإعادة التوجيه
 */
import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";
import { uploadToSpaces, getSignedVideoUrl, SPACES_ENABLED } from "../lib/spaces";

const router: IRouter = Router();

// ── مجلدات مؤقتة للأجزاء (تُحذف بعد الرفع إلى Spaces) ─────────────────
const uploadsDir = path.join(process.cwd(), "uploads");
const chunksDir  = path.join(uploadsDir, "chunks");
const videosDir  = path.join(uploadsDir, "videos"); // fallback لو Spaces معطّل

[chunksDir, videosDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(id);
}

// ── POST /upload/video/chunk ─────────────────────────────────────────────
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

// ── POST /upload/video/complete ──────────────────────────────────────────
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
    if (!fs.existsSync(path.join(uploadDir, `chunk_${i}.bin`))) {
      res.status(400).json({ error: `الجزء ${i} مفقود` });
      return;
    }
  }

  // امتداد آمن
  const ext = path.extname(filename).toLowerCase();
  const safeExt = [".mp4", ".m4v", ".mov", ".avi", ".mkv", ".webm"].includes(ext)
    ? ext : ".mp4";
  const finalName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
  const tempPath  = path.join(videosDir, finalName);
  const spacesKey = `videos/${finalName}`;

  // تجميع الأجزاء في ملف مؤقت
  try {
    await new Promise<void>((resolve, reject) => {
      const ws = fs.createWriteStream(tempPath);
      ws.on("finish", resolve);
      ws.on("error", reject);
      for (let i = 0; i < totalChunks; i++) {
        ws.write(fs.readFileSync(path.join(uploadDir, `chunk_${i}.bin`)));
      }
      ws.end();
    });
  } catch {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: "فشل تجميع الملف" });
    return;
  }

  // حذف الأجزاء المؤقتة
  fs.rmSync(uploadDir, { recursive: true, force: true });

  let url: string;

  if (SPACES_ENABLED) {
    // ── رفع إلى Spaces وحذف الملف المحلي ──────────────────────────────
    try {
      const mimeMap: Record<string, string> = {
        ".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime",
        ".avi": "video/x-msvideo", ".mkv": "video/x-matroska", ".webm": "video/webm",
      };
      await uploadToSpaces(tempPath, spacesKey, mimeMap[safeExt] ?? "video/mp4");
      fs.unlinkSync(tempPath); // حذف الملف المحلي بعد الرفع
      // الرابط المُعاد هو endpoint الـ stream الداخلي (filename فقط بدون videos/)
      url = `/api/upload/video/stream/${encodeURIComponent(finalName)}`;
    } catch (err) {
      // fallback: لو فشل الرفع لـ Spaces نحتفظ بالملف محلياً
      console.error("Spaces upload failed, using local fallback:", err);
      const domain = process.env["API_DOMAIN"] ?? process.env["REPLIT_DEV_DOMAIN"] ?? "localhost";
      const protocol = domain.includes("localhost") ? "http" : "https";
      url = `${protocol}://${domain}/api/uploads/videos/${finalName}`;
    }
  } else {
    // ── وضع التطوير: تخزين محلي ────────────────────────────────────────
    const domain = process.env["REPLIT_DEV_DOMAIN"] ?? "localhost";
    const protocol = domain.includes("localhost") ? "http" : "https";
    url = `${protocol}://${domain}/api/uploads/videos/${finalName}`;
  }

  res.json({ url, filename: finalName, key: spacesKey });
});

// ── GET /upload/video/stream/:filename ───────────────────────────────────
// يولّد Signed URL مؤقت (ساعتان) ويعيد التوجيه إليه
// مشغل الفيديو يتبع الـ redirect تلقائياً
// :filename = اسم الملف فقط بدون مسار (مثل: 1234567890-abc123.mp4)
router.get("/upload/video/stream/:filename", async (req, res): Promise<void> => {
  const filename = req.params["filename"] ?? "";

  if (!filename || filename.includes("/") || filename.includes("..")) {
    res.status(400).json({ error: "اسم ملف غير صالح" });
    return;
  }

  const key = `videos/${decodeURIComponent(filename)}`;

  try {
    const signedUrl = await getSignedVideoUrl(key, 7200);
    // إعادة التوجيه — مشغل الفيديو يتبعه بشكل تلقائي
    res.redirect(302, signedUrl);
  } catch (err) {
    console.error("Signed URL generation failed:", err);
    res.status(500).json({ error: "فشل توليد رابط التشغيل" });
  }
});

// ── DELETE /upload/video/cancel/:uploadId ────────────────────────────────
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

// ── POST /upload/video/from-url ──────────────────────────────────────────
// يستقبل رابط mp4 أو m3u8، يحمّله ويرفعه إلى Spaces، يُعيد رابط stream
// Body: { url: string }
router.post("/upload/video/from-url", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "الرابط مطلوب" });
    return;
  }

  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch {
    res.status(400).json({ error: "الرابط غير صالح" });
    return;
  }

  const pathname = parsedUrl.pathname.toLowerCase();
  const isM3u8 = pathname.endsWith(".m3u8") || pathname.includes(".m3u8");

  // ── m3u8: نحفظه كـ playlist file في Spaces ─────────────────────────────
  if (isM3u8) {
    if (!SPACES_ENABLED) {
      // fallback: أعد الرابط كما هو
      res.json({ url, type: "m3u8", stored: false });
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.m3u8`;
      const key = `videos/${filename}`;
      // رفع الـ m3u8 كنص
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      await spacesClient.send(new PutObjectCommand({
        Bucket: process.env["SPACES_BUCKET"] ?? "ostathibackup",
        Key: key,
        Body: text,
        ContentType: "application/vnd.apple.mpegurl",
        ACL: "private",
      }));
      const streamUrl = `/api/upload/video/stream/${encodeURIComponent(filename)}`;
      res.json({ url: streamUrl, type: "m3u8", stored: true, filename });
    } catch (err) {
      console.error("m3u8 fetch/upload failed:", err);
      // fallback: أعد الرابط الأصلي
      res.json({ url, type: "m3u8", stored: false });
    }
    return;
  }

  // ── mp4 / رابط مباشر: حمّل ورفع إلى Spaces ──────────────────────────────
  if (!SPACES_ENABLED) {
    res.json({ url, type: "mp4", stored: false });
    return;
  }

  const ext = (pathname.match(/\.(mp4|m4v|mov|avi|mkv|webm)$/)?.[1] ?? "mp4").toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const tempPath  = path.join(videosDir, filename);
  const spacesKey = `videos/${filename}`;

  try {
    // تحميل الملف كـ stream
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType =
      response.headers.get("content-type") ?? "video/mp4";

    // حفظ مؤقت على الديسك
    const nodeStream = require("node:stream");
    const ws = fs.createWriteStream(tempPath);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("لا يمكن قراءة البيانات");

    await new Promise<void>((resolve, reject) => {
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { ws.end(); break; }
            if (!ws.write(value)) await new Promise(r => ws.once("drain", r));
          }
          resolve();
        } catch (e) { reject(e); }
      };
      ws.on("error", reject);
      ws.on("finish", () => {});
      pump();
    });

    // رفع إلى Spaces
    await uploadToSpaces(tempPath, spacesKey, contentType);
    fs.unlinkSync(tempPath);

    const streamUrl = `/api/upload/video/stream/${encodeURIComponent(filename)}`;
    res.json({ url: streamUrl, type: ext, stored: true, filename });
  } catch (err: any) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error("URL download/upload failed:", err);
    res.status(500).json({ error: `فشل تحميل الفيديو: ${err.message ?? "خطأ غير معروف"}` });
  }
});

export default router;
