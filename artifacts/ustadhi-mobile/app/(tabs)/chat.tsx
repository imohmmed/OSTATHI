import React from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherCard } from '@/components/TeacherCard';
import { SkeletonRow } from '@/components/SkeletonLoader';
import { useGetTeachers } from '@workspace/api-client-react';
import { useTeacherInbox } from '@/hooks/useMessages';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';

// ─────────────────────────────────────────────
// STUDENT: قائمة الأساتذة الحقيقيين من قاعدة البيانات
// ─────────────────────────────────────────────
function StudentChatList() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: teachers, isLoading } = useGetTeachers();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: c.border }]}>
        <Text style={[styles.screenTitle, { color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          التواصل
        </Text>
      </View>

      <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, padding: 14, paddingTop: 10, textAlign: 'right' }]}>
        اختر الأستاذ لمراسلته
      </Text>

      <FlatList
        data={teachers ?? []}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => (
          <TeacherCard
            fullName={item.fullName}
            bio={item.bio}
            avatarUrl={item.avatarUrl}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!user) {
                router.push('/login');
                return;
              }
              router.push({
                pathname: '/conversation/[teacherId]' as any,
                params: {
                  teacherId: item.id,
                  teacherName: encodeURIComponent(item.fullName),
                },
              });
            }}
          />
        )}
        ListHeaderComponent={isLoading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> : null}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={40} color={c.mutedForeground} />
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                لا يوجد أساتذة حالياً
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// TEACHER / ASSISTANT: صندوق الوارد
// ─────────────────────────────────────────────
function TeacherInboxList() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  // المساعد يرى صندوق أستاذه، الأستاذ يرى صندوقه هو
  const inboxTeacherId = user?.role === 'assistant' ? user.teacherId : user?.id;
  const { data: allMessages, isLoading } = useTeacherInbox(inboxTeacherId);

  const conversations = React.useMemo(() => {
    if (!allMessages) return [];
    const map = new Map<number, {
      studentId: number;
      studentName: string;
      lastMessage: string;
      lastTime: string;
      unread: number;
    }>();
    for (const msg of allMessages) {
      const existing = map.get(msg.fromStudentId);
      const unread = !msg.isReadByTeacher ? 1 : 0;
      if (!existing) {
        map.set(msg.fromStudentId, {
          studentId: msg.fromStudentId,
          studentName: msg.studentName ?? `طالب #${msg.fromStudentId}`,
          lastMessage: msg.text,
          lastTime: msg.createdAt,
          unread,
        });
      } else {
        existing.unread += unread;
        if (msg.createdAt > existing.lastTime) {
          existing.lastMessage = msg.text;
          existing.lastTime = msg.createdAt;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastTime.localeCompare(a.lastTime));
  }, [allMessages]);

  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0);

  const isAssistant = user?.role === 'assistant';

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: c.border }]}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.screenTitle, { color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
            الرسائل
          </Text>
          {isAssistant && (
            <View style={[styles.assistantBadge, { backgroundColor: `${colors.gold}22` }]}>
              <Ionicons name="person-circle-outline" size={12} color={colors.gold} />
              <Text style={[{ color: colors.gold, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>
                مساعد الأستاذ {user?.teacherName}
              </Text>
            </View>
          )}
        </View>
        {totalUnread > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: c.destructive }]}>
            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>
              {totalUnread}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => String(c.studentId)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: '/inbox/[studentId]' as any,
                params: {
                  studentId: item.studentId,
                  studentName: encodeURIComponent(item.studentName),
                  // نمرر معرف الأستاذ للصفحة لمعرفة replierName
                  teacherId: inboxTeacherId,
                  teacherName: encodeURIComponent(
                    user?.role === 'assistant' ? (user.teacherName ?? '') : (user?.fullName ?? '')
                  ),
                },
              });
            }}
            style={[styles.convRow, { backgroundColor: c.card, borderColor: c.border }]}
          >
            {/* Avatar */}
            <View style={[styles.convAvatar, { backgroundColor: c.primary }]}>
              <Text style={[{ color: c.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 16 }]}>
                {item.studentName[0]}
              </Text>
            </View>
            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, textAlign: 'right' }]}>
                {item.studentName}
              </Text>
              <Text
                style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>
            {/* Unread badge */}
            {item.unread > 0 && (
              <View style={[styles.msgBadge, { backgroundColor: colors.gold }]}>
                <Text style={[{ color: colors.navy, fontFamily: 'Tajawal_700Bold', fontSize: 11 * fs }]}>
                  {item.unread}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-back" size={16} color={c.mutedForeground} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={isLoading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> : null}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={c.mutedForeground} />
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, textAlign: 'center' }]}>
                لا توجد رسائل من الطلاب بعد
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// ROOT — role-aware
// ─────────────────────────────────────────────
export default function ChatScreen() {
  const { user } = useAuth();
  if (user?.role === 'teacher' || user?.role === 'assistant') return <TeacherInboxList />;
  return <StudentChatList />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  screenTitle: { textAlign: 'right' },
  assistantBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  unreadBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  convRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  emptyContainer: { alignItems: 'center', gap: 10, marginTop: 40 },
});
