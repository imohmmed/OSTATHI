/**
 * Chat hooks — نظام المحادثات الحقيقي (ذهاباً وإياباً بلا حدود)
 * يستخدم chat_messages table الجديد
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
};

export interface ChatMsg {
  id: number;
  studentId: number;
  teacherId: number;
  senderType: 'student' | 'teacher' | 'assistant';
  senderName: string | null;
  text: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ChatConversation {
  studentId: number;
  studentName: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  lastSenderType: string;
}

// ── رفع صورة أو ملف ──────────────────────────────────────────
export async function uploadChatAttachment(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; type: 'image' | 'file'; name: string }> {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
  const res = await fetch(`${API_BASE()}/api/chat/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'فشل رفع الملف');
  }
  return res.json();
}

// ── جلب رسائل محادثة ─────────────────────────────────────────
export function useChatMessages(studentId?: number, teacherId?: number) {
  return useQuery<ChatMsg[]>({
    queryKey: ['chat', studentId, teacherId],
    queryFn: async () => {
      if (!studentId || !teacherId) return [];
      const res = await fetch(`${API_BASE()}/api/chat/${studentId}/${teacherId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!studentId && !!teacherId,
    refetchInterval: 10_000, // poll every 10s when in conversation
    staleTime: 0, // always fresh in chat
  });
}

// ── قائمة المحادثات للأستاذ ──────────────────────────────────
export function useTeacherConversations(teacherId?: number) {
  return useQuery<ChatConversation[]>({
    queryKey: ['chat-conversations', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const res = await fetch(`${API_BASE()}/api/chat/teacher/${teacherId}/conversations`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!teacherId,
    refetchInterval: 15_000,
    staleTime: 0,
  });
}

// ── إرسال رسالة (مع optimistic update) ───────────────────────
export function useSendChatMessage(studentId: number, teacherId: number) {
  const qc = useQueryClient();
  const key = ['chat', studentId, teacherId];

  return useMutation({
    mutationFn: async (payload: {
      senderType: 'student' | 'teacher' | 'assistant';
      senderName?: string;
      text?: string;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
    }) => {
      const res = await fetch(`${API_BASE()}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, teacherId, ...payload }),
      });
      if (!res.ok) throw new Error('فشل إرسال الرسالة');
      return res.json() as Promise<ChatMsg>;
    },

    // ── optimistic update: تظهر الرسالة فوراً ───────────────
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ChatMsg[]>(key) ?? [];
      const optimistic: ChatMsg = {
        id: -Date.now(), // temp negative id
        studentId,
        teacherId,
        senderType: payload.senderType,
        senderName: payload.senderName ?? null,
        text: payload.text ?? null,
        attachmentUrl: payload.attachmentUrl ?? null,
        attachmentType: payload.attachmentType ?? null,
        attachmentName: payload.attachmentName ?? null,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<ChatMsg[]>(key, [...prev, optimistic]);
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData<ChatMsg[]>(key, ctx.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['chat-conversations', teacherId] });
    },
  });
}

// ── تمييز المحادثة كمقروءة ────────────────────────────────────
export function useMarkChatRead(studentId: number, teacherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (readerType: 'student' | 'teacher') => {
      await fetch(`${API_BASE()}/api/chat/${studentId}/${teacherId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerType }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-conversations', teacherId] });
    },
  });
}
