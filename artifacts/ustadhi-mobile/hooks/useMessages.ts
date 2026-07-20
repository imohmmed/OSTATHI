import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
};

export interface ApiMessage {
  id: number;
  fromStudentId: number;
  studentName?: string | null;
  toTeacherId: number;
  // رسالة الطالب
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;  // 'image' | 'file'
  attachmentName?: string | null;
  // الرد
  replyText?: string | null;
  replyAttachmentUrl?: string | null;
  replyAttachmentType?: string | null;
  replyAttachmentName?: string | null;
  replierType?: string | null;    // 'teacher' | 'assistant'
  replierName?: string | null;    // اسم الأستاذ دائماً
  repliedAt?: string | null;
  // حالة
  isReadByTeacher: boolean;
  isReadByStudent: boolean;
  createdAt: string;
}

// ── رفع ملف/صورة ─────────────────────────────────────
export async function uploadAttachment(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; type: 'image' | 'file'; name: string }> {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
  const res = await fetch(`${API_BASE()}/api/messages/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('فشل رفع الملف');
  return res.json();
}

// ── محادثة الطالب مع أستاذ معين ─────────────────────
export function useStudentConversation(studentId?: number, teacherId?: number) {
  return useQuery<ApiMessage[]>({
    queryKey: ['conversation', studentId, teacherId],
    queryFn: async () => {
      if (!studentId || !teacherId) return [];
      const res = await fetch(`${API_BASE()}/api/messages/student/${studentId}/teacher/${teacherId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!studentId && !!teacherId,
    refetchInterval: 30_000, // poll every 30s instead of 5s
  });
}

// ── صندوق وارد الأستاذ ───────────────────────────────
export function useTeacherInbox(teacherId?: number) {
  return useQuery<ApiMessage[]>({
    queryKey: ['teacher-inbox', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const res = await fetch(`${API_BASE()}/api/messages/teacher/${teacherId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!teacherId,
    refetchInterval: 30_000, // poll every 30s instead of 6s
  });
}

// ── إرسال رسالة (طالب → أستاذ) ──────────────────────
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fromStudentId,
      toTeacherId,
      text,
      attachmentUrl,
      attachmentType,
      attachmentName,
    }: {
      fromStudentId: number;
      toTeacherId: number;
      text: string;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
    }) => {
      const res = await fetch(`${API_BASE()}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromStudentId, toTeacherId, text, attachmentUrl, attachmentType, attachmentName }),
      });
      if (!res.ok) throw new Error('فشل إرسال الرسالة');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['conversation', vars.fromStudentId, vars.toTeacherId] });
    },
  });
}

// ── رد الأستاذ أو المساعد ────────────────────────────
export function useReplyMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      replyText,
      replierType,
      replierName,
      replyAttachmentUrl,
      replyAttachmentType,
      replyAttachmentName,
    }: {
      messageId: number;
      replyText: string;
      replierType: 'teacher' | 'assistant';
      replierName: string;
      replyAttachmentUrl?: string;
      replyAttachmentType?: string;
      replyAttachmentName?: string;
    }) => {
      const res = await fetch(`${API_BASE()}/api/messages/${messageId}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText, replierType, replierName, replyAttachmentUrl, replyAttachmentType, replyAttachmentName }),
      });
      if (!res.ok) throw new Error('فشل إرسال الرد');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-inbox'] });
    },
  });
}
