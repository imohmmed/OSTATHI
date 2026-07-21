/**
 * useChunkedUpload — رفع الفيديوهات الكبيرة بتقنية Chunked Upload
 *
 * يقسّم الملف إلى أجزاء 3MB، يرفعها تباعاً، ثم يطلب من السيرفر تجميعها.
 * يُعيد progress (0–100) ورابط الفيديو النهائي عند الانتهاء.
 */
import { useState, useRef } from 'react';
import * as FileSystem from 'expo-file-system';

const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB

function generateUploadId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useChunkedUpload() {
  const [progress, setProgress]     = useState(0);     // 0 – 100
  const [isUploading, setUploading] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const getBase = () => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    return domain ? `https://${domain}` : '';
  };

  /**
   * يرفع الملف على شكل أجزاء ويُعيد رابط الفيديو النهائي.
   * @param fileUri   — URI الملف المحلي
   * @param fileSize  — حجم الملف بالبايت
   * @param filename  — اسم الملف الأصلي (للامتداد)
   */
  const upload = async (
    fileUri: string,
    fileSize: number,
    filename: string,
  ): Promise<string> => {
    const base       = getBase();
    const uploadId   = generateUploadId();
    uploadIdRef.current = uploadId;
    cancelledRef.current = false;

    setUploading(true);
    setProgress(0);
    setError(null);

    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    try {
      // ── رفع الأجزاء ─────────────────────────────────────────────────
      for (let i = 0; i < totalChunks; i++) {
        if (cancelledRef.current) throw new Error('تم الإلغاء');

        const position = i * CHUNK_SIZE;
        const length   = Math.min(CHUNK_SIZE, fileSize - position);

        const data = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64' as any,
          position,
          length,
        });

        const res = await fetch(`${base}/api/upload/video/chunk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId, chunkIndex: i, totalChunks, data }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `فشل رفع الجزء ${i + 1}`);
        }

        // 90% للرفع، 10% للتجميع
        setProgress(Math.round(((i + 1) / totalChunks) * 90));
      }

      if (cancelledRef.current) throw new Error('تم الإلغاء');

      // ── تجميع الأجزاء ───────────────────────────────────────────────
      const res = await fetch(`${base}/api/upload/video/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, totalChunks, filename }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'فشل تجميع الفيديو');
      }

      const { url } = await res.json();
      setProgress(100);
      return url as string;
    } catch (e: any) {
      const msg = e?.message ?? 'حدث خطأ أثناء الرفع';
      setError(msg);
      // تنظيف الأجزاء المؤقتة
      try {
        await fetch(`${base}/api/upload/video/cancel/${uploadId}`, {
          method: 'DELETE',
        });
      } catch {}
      throw e;
    } finally {
      setUploading(false);
    }
  };

  /** إلغاء الرفع الجاري وحذف الأجزاء */
  const cancel = async () => {
    cancelledRef.current = true;
    const base = getBase();
    if (uploadIdRef.current) {
      try {
        await fetch(`${base}/api/upload/video/cancel/${uploadIdRef.current}`, {
          method: 'DELETE',
        });
      } catch {}
      uploadIdRef.current = null;
    }
    setUploading(false);
    setProgress(0);
    setError(null);
  };

  const reset = () => {
    setProgress(0);
    setError(null);
    setUploading(false);
  };

  return { upload, cancel, reset, progress, isUploading, error };
}
