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
  text: string;
  replyText?: string | null;
  repliedAt?: string | null;
  isReadByTeacher: boolean;
  isReadByStudent: boolean;
  createdAt: string;
}

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
    refetchInterval: 5000,
  });
}

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
    refetchInterval: 8000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fromStudentId,
      toTeacherId,
      text,
    }: {
      fromStudentId: number;
      toTeacherId: number;
      text: string;
    }) => {
      const res = await fetch(`${API_BASE()}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromStudentId, toTeacherId, text }),
      });
      if (!res.ok) throw new Error('فشل إرسال الرسالة');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['conversation', vars.fromStudentId, vars.toTeacherId] });
    },
  });
}

export function useReplyMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      replyText,
    }: {
      messageId: number;
      replyText: string;
    }) => {
      const res = await fetch(`${API_BASE()}/api/messages/${messageId}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText }),
      });
      if (!res.ok) throw new Error('فشل إرسال الرد');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher-inbox'] });
    },
  });
}
