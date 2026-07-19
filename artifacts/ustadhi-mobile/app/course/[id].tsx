import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { LessonStepItem } from '@/components/LessonStepItem';
import { SkeletonBox } from '@/components/SkeletonLoader';
import { AddLessonModal } from '@/components/AddLessonModal';
import {
  useGetCourse,
  useDeleteLesson,
  getGetCourseQueryKey,
} from '@workspace/api-client-react';

// ─── Course Detail Screen ─────────────────────
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const queryClient = useQueryClient();

  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: course, isLoading } = useGetCourse(courseId);
  const deleteLesson = useDeleteLesson();

  const lessons = course?.lessons ?? [];
  const isOwner = user?.role === 'teacher' && course?.teacherId === user.id;

  const handleDeleteLesson = (lessonId: number, title: string) => {
    Alert.alert(
      'حذف المحاضرة',
      `هل تريد حذف "${title}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            deleteLesson.mutate({ id: lessonId }, {
              onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) }),
              onError: () => Alert.alert('خطأ', 'فشل الحذف'),
            });
          },
        },
      ]
    );
  };

  const handleAddSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — no extra paddingTop since header is already dark */}
        <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.heroSection}>
          {isLoading ? (
            <View style={{ gap: 10, width: '100%' }}>
              <SkeletonBox height={20} width="70%" borderRadius={8} />
              <SkeletonBox height={14} width="50%" borderRadius={8} />
              <SkeletonBox height={14} width="40%" borderRadius={8} />
            </View>
          ) : (
            <>
              <View style={styles.heroMeta}>
                {course?.subjectName && (
                  <View style={styles.badge}>
                    <Text style={[{ fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs, color: '#fff' }]}>
                      {course.subjectName}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.heroTitle, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs }]}>
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
              { icon: 'play-circle' as const, value: String(lessons.length), label: 'محاضرة' },
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

        {/* Lessons section */}
        <View style={styles.lessonsSection}>
          <View style={styles.lessonsSectionHeader}>
            <Text style={[styles.lessonsTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
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

          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.skeletonRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <SkeletonBox width={32} height={32} borderRadius={16} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBox height={14} width="70%" />
                  <SkeletonBox height={10} width="40%" />
                </View>
              </View>
            ))
          ) : lessons.length === 0 ? (
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
          ) : (
            lessons.map((lesson, idx) => (
              <View key={lesson.id} style={styles.lessonRow}>
                <View style={{ flex: 1 }}>
                  <LessonStepItem
                    title={lesson.title}
                    type={lesson.type as any}
                    order={idx + 1}
                    duration={lesson.duration}
                    isCompleted={false}
                    onPress={() => {}}
                  />
                </View>
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => handleDeleteLesson(lesson.id, lesson.title)}
                    style={styles.deleteLessonBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button for teachers */}
      {isOwner && lessons.length > 0 && (
        <TouchableOpacity
          onPress={() => setAddModalOpen(true)}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: 24 + insets.bottom }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Lesson Modal */}
      {addModalOpen && (
        <AddLessonModal
          visible={addModalOpen}
          courseId={courseId}
          teacherId={user?.id ?? 0}
          lessonsCount={lessons.length}
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
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { alignItems: 'center', gap: 2 },
  lessonsSection: { paddingTop: 20 },
  lessonsSectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 },
  lessonsTitle: {},
  addLessonBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  lessonRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  deleteLessonBtn: { paddingHorizontal: 12, paddingVertical: 14 },
  skeletonRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
  emptyContainer: { alignItems: 'center', gap: 12, marginTop: 40, paddingHorizontal: 32 },
  emptyAddBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: {},
  modalCloseBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  modalSaveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  fieldGroup: { gap: 8 },
  fieldLabel: {},
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 120, fontSize: 14 },
  typeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
});
