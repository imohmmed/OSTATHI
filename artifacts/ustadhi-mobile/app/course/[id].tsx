import React from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { ProgressBar } from '@/components/ProgressBar';
import { LessonStepItem } from '@/components/LessonStepItem';
import { SkeletonBox } from '@/components/SkeletonLoader';
import { useGetCourse } from '@workspace/api-client-react';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;

  const { data: course, isLoading } = useGetCourse(courseId);
  const lessons = course?.lessons ?? [];

  const handleLessonPress = (lessonId: number, type: string) => {
    // Future: navigate to lesson player
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
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
                  <Text style={[styles.badgeText, { fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
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
                <Text style={[styles.heroSub, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.8)', fontSize: 13 * fs }]}>
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

      {/* Stats row */}
      {!isLoading && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border, borderTopColor: colors.border }]}>
          {[
            { icon: 'play-circle' as const, value: String(lessons.length), label: 'محاضرة' },
            { icon: 'people' as const, value: String(course?.studentsCount ?? 0), label: 'طالب' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Ionicons name={s.icon} size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                {s.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Lessons */}
      <View style={styles.lessonsSection}>
        <Text style={[styles.lessonsTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
          محتوى الدورة
        </Text>

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
            <Ionicons name="book-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
              لم تُضف محاضرات لهذه الدورة بعد
            </Text>
          </View>
        ) : (
          lessons.map((lesson, idx) => (
            <LessonStepItem
              key={lesson.id}
              title={lesson.title}
              type={lesson.type as any}
              order={idx + 1}
              duration={lesson.duration}
              isCompleted={false}
              onPress={() => handleLessonPress(lesson.id, lesson.type)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: {
    padding: 20,
    paddingTop: 24,
    gap: 10,
  },
  heroMeta: { flexDirection: 'row-reverse' },
  badge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: '#fff' },
  heroTitle: { textAlign: 'right', lineHeight: 32 },
  heroRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  heroSub: { textAlign: 'right' },
  heroDesc: { textAlign: 'right', lineHeight: 20, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: {},
  statLabel: {},
  lessonsSection: { paddingTop: 20, gap: 0 },
  lessonsTitle: { paddingHorizontal: 16, marginBottom: 12, textAlign: 'right' },
  skeletonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  emptyContainer: { alignItems: 'center', gap: 10, marginTop: 30 },
  emptyText: { textAlign: 'center' },
});
