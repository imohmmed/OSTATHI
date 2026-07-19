import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { LessonStepItem } from '@/components/LessonStepItem';
import { SkeletonBox } from '@/components/SkeletonLoader';
import { AddLessonModal } from '@/components/AddLessonModal';
import {
  useGetCourse,
  useDeleteLesson,
  useUpdateLesson,
  getGetCourseQueryKey,
} from '@workspace/api-client-react';

type Lesson = {
  id: number;
  title: string;
  type: string;
  order: number;
  duration?: number | null;
  contentUrl?: string | null;
  contentText?: string | null;
  isPublished?: boolean;
};

// ─── Course Detail Screen ─────────────────────
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);

  const { data: course, isLoading } = useGetCourse(courseId);
  const deleteLesson = useDeleteLesson();
  const updateLesson = useUpdateLesson();

  const lessons: Lesson[] = (course?.lessons ?? []) as Lesson[];
  const isOwner = user?.role === 'teacher' && course?.teacherId === user.id;

  // Sync ordered lessons when data loads / changes
  useEffect(() => {
    setOrderedLessons(lessons);
  }, [course?.lessons]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleDeleteLesson = (lessonId: number, title: string) => {
    Alert.alert('حذف المحاضرة', `هل تريد حذف "${title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          deleteLesson.mutate(
            { id: lessonId },
            {
              onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) }),
              onError: () => Alert.alert('خطأ', 'فشل الحذف'),
            }
          );
        },
      },
    ]);
  };

  const handleDragEnd = useCallback(
    ({ data }: { data: Lesson[] }) => {
      setOrderedLessons(data);
      // Save new order — only update lessons whose order actually changed
      data.forEach((lesson, idx) => {
        const newOrder = idx + 1;
        if (lesson.order !== newOrder) {
          updateLesson.mutate(
            { id: lesson.id, data: { order: newOrder } as any },
            {
              onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) }),
            }
          );
        }
      });
    },
    [courseId, updateLesson, queryClient]
  );

  const handleAddSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
  };

  const handleLessonPress = useCallback(
    (lesson: Lesson) => {
      if (isOwner) {
        router.push({
          pathname: '/lesson/[id]' as any,
          params: { id: lesson.id, courseId },
        });
      }
    },
    [isOwner, courseId, router]
  );

  // ── List Header (hero + stats + section title) ───────────────────
  const renderHeader = () => (
    <>
      {/* Hero */}
      <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.heroSection}>
        {isLoading ? (
          <View style={{ gap: 10, width: '100%' }}>
            <SkeletonBox height={24} width="70%" borderRadius={8} />
            <SkeletonBox height={14} width="40%" borderRadius={6} />
            <SkeletonBox height={12} width="55%" borderRadius={6} />
          </View>
        ) : (
          <>
            <View style={styles.heroMeta}>
              {course?.subject && (
                <View style={styles.badge}>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }}>
                    {course.subject}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.heroTitle, { color: '#fff', fontFamily: 'Tajawal_800ExtraBold', fontSize: 22 * fs }]}>
              {course?.title}
            </Text>
            {course?.teacherName && (
              <View style={styles.heroRow}>
                <Ionicons name="person" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.8)', fontSize: 13 * fs }]}>
                  {course.teacherName}
                </Text>
              </View>
            )}
            {course?.description && (
              <Text style={[styles.heroDesc, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.65)', fontSize: 13 * fs }]}>
                {course.description}
              </Text>
            )}
          </>
        )}
      </LinearGradient>

      {/* Stats */}
      {!isLoading && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border, borderTopColor: colors.border }]}>
          {[
            { icon: 'play-circle' as const, value: String(orderedLessons.length), label: 'محاضرة' },
            { icon: 'people' as const, value: String((course as any)?.studentsCount ?? 0), label: 'طالب' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Ionicons name={s.icon} size={16} color={colors.primary} />
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>{s.value}</Text>
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Lessons section header */}
      <View style={styles.lessonsSectionHeader}>
        <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
          محتوى الدورة
        </Text>
        {isOwner && (
          <TouchableOpacity
            onPress={() => setAddModalOpen(true)}
            style={[styles.addLessonBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>إضافة محاضرة</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hint for teachers */}
      {isOwner && orderedLessons.length > 1 && (
        <View style={[styles.dragHint, { backgroundColor: colors.muted }]}>
          <Ionicons name="swap-vertical-outline" size={14} color={colors.mutedForeground} />
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
            اضغط مطوّلاً على ≡ لإعادة ترتيب المحاضرات
          </Text>
        </View>
      )}

      {/* Skeletons while loading */}
      {isLoading && (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.skeletonRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <SkeletonBox width={32} height={32} borderRadius={16} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox height={14} width="70%" />
                <SkeletonBox height={10} width="40%" />
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  // ── Empty component (no lessons) ────────────────────────────────
  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="book-outline" size={52} color={colors.mutedForeground} />
        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs, textAlign: 'center' }]}>
          لا توجد محاضرات بعد
        </Text>
        {isOwner && (
          <TouchableOpacity
            onPress={() => setAddModalOpen(true)}
            style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>أضف أول محاضرة</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Lesson row ──────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Lesson>) => {
      const idx = getIndex() ?? 0;
      return (
        <ScaleDecorator activeScale={0.97}>
          <View
            style={[
              styles.lessonRow,
              isActive && { backgroundColor: colors.muted, borderRadius: 12 },
            ]}
          >
            {/* Drag handle — teacher only */}
            {isOwner && (
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={200}
                style={styles.dragHandle}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <Ionicons
                  name="reorder-three-outline"
                  size={22}
                  color={isActive ? colors.primary : colors.mutedForeground}
                />
              </TouchableOpacity>
            )}

            {/* Lesson item */}
            <View style={{ flex: 1 }}>
              <LessonStepItem
                title={item.title}
                type={item.type as any}
                order={idx + 1}
                duration={item.duration}
                isCompleted={false}
                onPress={isOwner ? () => handleLessonPress(item) : undefined}
              />
            </View>

            {/* Delete button — teacher only */}
            {isOwner && (
              <TouchableOpacity
                onPress={() => handleDeleteLesson(item.id, item.title)}
                style={styles.deleteLessonBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={17} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </ScaleDecorator>
      );
    },
    [isOwner, colors, handleLessonPress]
  );

  // ── Render ──────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DraggableFlatList<Lesson>
        data={orderedLessons}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        // Disable drag for students / no-owner views
        dragItemOverflow={false}
        activationDistance={isOwner ? 0 : 99999}
      />

      {/* FAB */}
      {isOwner && orderedLessons.length > 0 && (
        <TouchableOpacity
          onPress={() => setAddModalOpen(true)}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: 24 + insets.bottom }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add lesson modal */}
      {addModalOpen && (
        <AddLessonModal
          visible={addModalOpen}
          courseId={courseId}
          teacherId={user?.id ?? 0}
          lessonsCount={orderedLessons.length}
          onClose={() => setAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { padding: 20, paddingTop: 20, gap: 10 },
  heroMeta: { flexDirection: 'row-reverse' },
  badge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  heroTitle: { textAlign: 'right', lineHeight: 32 },
  heroRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  heroDesc: { textAlign: 'right', lineHeight: 20, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 2 },
  lessonsSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
  },
  addLessonBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  dragHint: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  lessonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  dragHandle: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  deleteLessonBtn: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  skeletonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
    paddingHorizontal: 32,
  },
  emptyAddBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
