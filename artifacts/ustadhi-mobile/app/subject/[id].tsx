import React from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { TeacherCard } from '@/components/TeacherCard';
import { SkeletonRow } from '@/components/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';
import { useGetTeachers, useGetSubjects } from '@workspace/api-client-react';
import { useApp as useAppCtx } from '@/contexts/AppContext';

// Iraqi school grade levels in order
const GRADE_ORDER = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
  'الصف الأول المتوسط',
  'الصف الثاني المتوسط',
  'الصف الثالث المتوسط',
  'الصف الأول الإعدادي',
  'الصف الثاني الإعدادي',
  'الصف الثالث الإعدادي',
  'الصف الرابع الإعدادي',
  'الصف الخامس الإعدادي',
  'الصف السادس الإعدادي',
];

interface TeacherWithGrades {
  id: number;
  fullName: string;
  bio?: string;
  avatarUrl?: string | null;
  gradeLevels?: string[];
}

export default function SubjectTeachersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = Number(id);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useAppCtx();
  const fs = fontScale;

  const { data: subjects } = useGetSubjects();
  const subject = subjects?.find((s) => s.id === subjectId);

  const { data: teachers, isLoading } = useGetTeachers({ subjectId });

  // Group teachers by grade level
  const grouped = React.useMemo(() => {
    if (!teachers?.length) return [];

    const gradeMap = new Map<string, TeacherWithGrades[]>();
    const ungrouped: TeacherWithGrades[] = [];

    for (const teacher of teachers as TeacherWithGrades[]) {
      const levels = teacher.gradeLevels ?? [];
      if (levels.length === 0) {
        ungrouped.push(teacher);
      } else {
        for (const gl of levels) {
          if (!gradeMap.has(gl)) gradeMap.set(gl, []);
          gradeMap.get(gl)!.push(teacher);
        }
      }
    }

    // Sort by Iraqi grade order
    const sortedGrades = Array.from(gradeMap.keys()).sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a);
      const bi = GRADE_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const sections: { grade: string; teachers: TeacherWithGrades[] }[] = sortedGrades.map(g => ({
      grade: g,
      teachers: gradeMap.get(g)!,
    }));

    if (ungrouped.length > 0) {
      sections.push({ grade: 'عام', teachers: ungrouped });
    }

    return sections;
  }, [teachers]);

  const hasGrades = grouped.length > 0 && (grouped.length > 1 || grouped[0]?.grade !== 'عام');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={{ paddingTop: 12 }}>
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </View>
      ) : !teachers?.length ? (
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}>
            لا يوجد أساتذة لهذه المادة حالياً
          </Text>
        </View>
      ) : hasGrades ? (
        // Grouped by grade level
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 60 + insets.bottom }}
        >
          {grouped.map(({ grade, teachers: gradeTeachers }) => (
            <View key={grade} style={styles.gradeSection}>
              <View style={[styles.gradeHeader, { backgroundColor: colors.primary + '18', borderRightColor: colors.primary }]}>
                <Text style={[styles.gradeTitle, { color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                  مدرسو {grade}
                </Text>
              </View>
              {gradeTeachers.map((t) => (
                <TeacherCard
                  key={t.id}
                  fullName={t.fullName}
                  bio={t.bio}
                  avatarUrl={t.avatarUrl}
                  onPress={() => router.push(`/teacher/${t.id}`)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        // No grades assigned — plain list
        <FlatList
          data={teachers ?? []}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => (
            <TeacherCard
              fullName={item.fullName}
              bio={(item as any).bio}
              avatarUrl={(item as any).avatarUrl}
              onPress={() => router.push(`/teacher/${item.id}`)}
            />
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 60 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText: { textAlign: 'center' },
  gradeSection: { marginBottom: 8 },
  gradeHeader: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderRightWidth: 4,
  },
  gradeTitle: { textAlign: 'right' },
});
