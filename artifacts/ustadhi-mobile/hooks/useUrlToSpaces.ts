/**
 * useUrlToSpaces — يأخذ رابط mp4 أو m3u8 ويرفعه لـ Spaces عبر السيرفر
 * يُعيد رابط stream مؤمّن بدلاً من الرابط الأصلي
 */
import { useState, useRef } from 'react';

type Status = 'idle' | 'uploading' | 'done' | 'error';

export function useUrlToSpaces() {
  const [status, setStatus]     = useState<Status>('idle');
  const [error, setError]       = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const isUploading = status === 'uploading';
  const isDone      = status === 'done';

  const save = async (url: string): Promise<string> => {
    setStatus('uploading');
    setError(null);
    setResultUrl('');

    abortRef.current = new AbortController();

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base   = domain ? `https://${domain}` : '';

      const response = await fetch(`${base}/api/upload/video/from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `خطأ ${response.status}`);
      }

      const data = await response.json() as {
        url: string;
        type: string;
        stored: boolean;
      };

      setResultUrl(data.url);
      setStatus('done');
      return data.url;
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setStatus('idle');
        return '';
      }
      const msg = e?.message ?? 'فشل حفظ الرابط';
      setError(msg);
      setStatus('error');
      throw new Error(msg);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setStatus('idle');
    setError(null);
  };

  const reset = () => {
    abortRef.current?.abort();
    setStatus('idle');
    setError(null);
    setResultUrl('');
  };

  return { save, cancel, reset, status, isUploading, isDone, error, resultUrl };
}

/** هل الرابط mp4 مباشر؟ */
export function isMp4Url(url: string): boolean {
  try {
    const p = new URL(url).pathname.toLowerCase();
    return /\.(mp4|m4v|mov|avi|mkv|webm)(\?|$)/.test(p);
  } catch { return false; }
}

/** هل الرابط m3u8؟ */
export function isM3u8Url(url: string): boolean {
  try {
    const p = new URL(url).pathname.toLowerCase();
    return p.includes('.m3u8');
  } catch { return false; }
}

/** هل الرابط يحتاج حفظ في Spaces (mp4 أو m3u8)؟ */
export function needsSpacesStorage(url: string): boolean {
  return isMp4Url(url) || isM3u8Url(url);
}
