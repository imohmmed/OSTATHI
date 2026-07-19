import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherCard } from '@/components/TeacherCard';
import { SkeletonRow } from '@/components/SkeletonLoader';
import { useGetTeachers } from '@workspace/api-client-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

interface ApiMessage {
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

type TeacherConversation = {
  teacherId: number;
  teacherName: string;
  lastMessage: string;
  unread: number;
};

type StudentConversation = {
  studentId: number;
  studentName: string;
  lastMessage: string;
  unread: number;
};

const API_BASE = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
};

function useStudentConversation(studentId: number | undefined, teacherId: number | undefined) {
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

function useTeacherInbox(teacherId: number | undefined) {
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

function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fromStudentId, toTeacherId, text }: { fromStudentId: number; toTeacherId: number; text: string }) => {
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

function useReplyMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, replyText }: { messageId: number; replyText: string }) => {
      const res = await fetch(`${API_BASE()}/api/messages/${messageId}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText }),
      });
      if (!res.ok) throw new Error('فشل إرسال الرد');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-inbox'] });
    },
  });
}

// ─────────────────────────────────────────────
// STUDENT CHAT SCREEN
// ─────────────────────────────────────────────
function StudentChat() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedTeacherName, setSelectedTeacherName] = useState('');
  const [draft, setDraft] = useState('');

  const { data: teachers, isLoading } = useGetTeachers();
  const { data: messages, isLoading: ml } = useStudentConversation(user?.id, selectedTeacherId ?? undefined);
  const sendMsg = useSendMessage();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const sendMessage = () => {
    if (!draft.trim() || selectedTeacherId === null || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMsg.mutate({ fromStudentId: user.id, toTeacherId: selectedTeacherId, text: draft.trim() });
    setDraft('');
  };

  if (selectedTeacherId !== null) {
    return (
      <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.chatHeader, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => setSelectedTeacherId(null)} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs, textAlign: 'right' }]}>{selectedTeacherName}</Text>
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}>يرد المساعد عادةً خلال دقائق</Text>
          </View>
        </View>

        {ml ? (
          <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <FlatList
            data={messages ?? []}
            inverted
            keyExtractor={(m) => String(m.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 8 }}>
                {/* Student message */}
                <View style={[styles.bubbleMe, { backgroundColor: colors.primary }]}>
                  <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 20 }]}>{item.text}</Text>
                </View>
                {/* Teacher reply */}
                {item.replyText && (
                  <View style={[styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs, marginBottom: 3 }]}>رد الأستاذ</Text>
                    <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 20 }]}>{item.replyText}</Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.mutedForeground} />
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>ابدأ محادثتك مع المساعد</Text>
              </View>
            }
          />
        )}

        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}>
          <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.4 }]}>
            {sendMsg.isPending ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Ionicons name="send" size={18} color={colors.primaryForeground} />}
          </TouchableOpacity>
          <TextInput
            value={draft} onChangeText={setDraft}
            placeholder="اكتب رسالتك..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
            multiline textAlign="right"
            onSubmitEditing={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>التواصل</Text>
      </View>
      <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, padding: 14, paddingTop: 10, textAlign: 'right' }]}>
        اختر الأستاذ للتواصل معه عبر مساعده
      </Text>
      <FlatList
        data={teachers ?? []}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => (
          <TeacherCard fullName={item.fullName} bio={item.bio} avatarUrl={item.avatarUrl}
            onPress={() => { setSelectedTeacherId(item.id); setSelectedTeacherName(item.fullName); }} />
        )}
        ListHeaderComponent={isLoading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>لا يوجد أساتذة حالياً</Text>
          </View>
        ) : null}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// TEACHER INBOX SCREEN
// ─────────────────────────────────────────────
function TeacherChat() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [draft, setDraft] = useState('');

  const { data: allMessages, isLoading } = useTeacherInbox(user?.id);
  const replyMsg = useReplyMessage();
  const qc = useQueryClient();

  // Group messages by student
  const conversations: StudentConversation[] = React.useMemo(() => {
    if (!allMessages) return [];
    const map = new Map<number, StudentConversation>();
    for (const msg of allMessages) {
      const existing = map.get(msg.fromStudentId);
      const unread = !msg.isReadByTeacher ? 1 : 0;
      if (!existing) {
        map.set(msg.fromStudentId, {
          studentId: msg.fromStudentId,
          studentName: msg.studentName ?? `طالب #${msg.fromStudentId}`,
          lastMessage: msg.text,
          unread,
        });
      } else {
        existing.unread += unread;
        existing.lastMessage = msg.text;
      }
    }
    return Array.from(map.values());
  }, [allMessages]);

  const selectedConv = allMessages?.filter((m) => m.fromStudentId === selectedStudentId) ?? [];

  const sendReply = (messageId: number) => {
    if (!draft.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    replyMsg.mutate({ messageId, replyText: draft.trim() }, {
      onSuccess: () => {
        setDraft('');
        qc.invalidateQueries({ queryKey: ['teacher-inbox', user?.id] });
      },
    });
  };

  const latestUnrepliedId = selectedConv.find((m) => !m.replyText)?.id;

  if (selectedStudentId !== null) {
    return (
      <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.chatHeader, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => setSelectedStudentId(null)} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs, textAlign: 'right' }]}>{selectedStudentName}</Text>
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}>محادثة مع الطالب</Text>
          </View>
        </View>

        <FlatList
          data={selectedConv}
          inverted
          keyExtractor={(m) => String(m.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 10 }}>
              <View style={[styles.bubbleThem, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 20 }]}>{item.text}</Text>
              </View>
              {item.replyText && (
                <View style={[styles.bubbleMe, { backgroundColor: colors.primary }]}>
                  <Text style={[{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs, marginBottom: 3 }]}>ردي</Text>
                  <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 20 }]}>{item.replyText}</Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<View style={styles.emptyChat}><Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>لا توجد رسائل</Text></View>}
        />

        {/* Reply input — shows only if there's an unreplied message */}
        {latestUnrepliedId && (
          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}>
            <TouchableOpacity
              onPress={() => sendReply(latestUnrepliedId)}
              style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.4 }]}
            >
              {replyMsg.isPending ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Ionicons name="send" size={18} color={colors.primaryForeground} />}
            </TouchableOpacity>
            <TextInput
              value={draft} onChangeText={setDraft}
              placeholder="اكتب ردك..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
              multiline textAlign="right"
            />
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>الرسائل</Text>
        {conversations.some((c) => c.unread > 0) && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.destructive }]}>
            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>
              {conversations.reduce((a, c) => a + c.unread, 0)}
            </Text>
          </View>
        )}
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(c) => String(c.studentId)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => { setSelectedStudentId(item.studentId); setSelectedStudentName(item.studentName); }}
            style={[styles.convRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.convAvatar, { backgroundColor: colors.primary }]}>
              <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 16 }]}>{item.studentName[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, textAlign: 'right' }]}>{item.studentName}</Text>
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            {item.unread > 0 && (
              <View style={[styles.msgBadge, { backgroundColor: colors.primary }]}>
                <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 11 * fs }]}>{item.unread}</Text>
              </View>
            )}
            <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={isLoading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, textAlign: 'center' }]}>
              لا توجد رسائل من الطلاب بعد
            </Text>
          </View>
        ) : null}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT — role-aware
// ─────────────────────────────────────────────
export default function ChatScreen() {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <TeacherChat />;
  return <StudentChat />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  screenTitle: { textAlign: 'right' },
  unreadBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  chatHeader: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  chatHeaderInfo: { flex: 1 },
  bubbleMe: { maxWidth: '80%', borderRadius: 16, borderBottomRightRadius: 4, padding: 12, marginBottom: 4, alignSelf: 'flex-end' },
  bubbleThem: { maxWidth: '80%', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1, alignSelf: 'flex-start' },
  emptyChat: { alignItems: 'center', gap: 10, marginTop: 40 },
  inputBar: { flexDirection: 'row-reverse', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  convRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 14, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, gap: 12 },
  convAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  emptyContainer: { alignItems: 'center', gap: 10, marginTop: 40 },
});
