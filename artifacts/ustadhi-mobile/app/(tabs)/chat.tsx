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

// ─────────────────────────────────────────────
// STUDENT: قائمة الأساتذة → يضغط أستاذ → صفحة المحادثة
// ─────────────────────────────────────────────
function StudentChatList() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const router = useRouter();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: teachers, isLoading } = useGetTeachers();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          التواصل
        </Text>
      </View>

      <Text style={[{
        color: colors.mutedForeground,
        fontFamily: 'Tajawal_400Regular',
        fontSize: 13 * fs,
        padding: 14, paddingTop: 10,
        textAlign: 'right',
      }]}>
        اختر الأستاذ للتواصل معه
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
              router.push({
                pathname: '/conversation/[teacherId]' as any,
                params: { teacherId: item.id, teacherName: item.fullName },
              });
            }}
          />
        )}
        ListHeaderComponent={isLoading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> : null}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
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
// TEACHER: صندوق الوارد → يضغط طالب → صفحة المحادثة
// ─────────────────────────────────────────────
function TeacherInboxList() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: allMessages, isLoading } = useTeacherInbox(user?.id);

  const conversations = React.useMemo(() => {
    if (!allMessages) return [];
    const map = new Map<number, { studentId: number; studentName: string; lastMessage: string; unread: number }>();
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

  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          الرسائل
        </Text>
        {totalUnread > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.destructive }]}>
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
                params: { studentId: item.studentId, studentName: item.studentName },
              });
            }}
            style={[styles.convRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {/* Avatar */}
            <View style={[styles.convAvatar, { backgroundColor: colors.primary }]}>
              <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 16 }]}>
                {item.studentName[0]}
              </Text>
            </View>
            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, textAlign: 'right' }]}>
                {item.studentName}
              </Text>
              <Text
                style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>
            {/* Unread badge */}
            {item.unread > 0 && (
              <View style={[styles.msgBadge, { backgroundColor: colors.gold }]}>
                <Text style={[{ color: colors.goldForeground, fontFamily: 'Tajawal_700Bold', fontSize: 11 * fs }]}>
                  {item.unread}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={isLoading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> : null}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, textAlign: 'center' }]}>
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
  if (user?.role === 'teacher') return <TeacherInboxList />;
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
