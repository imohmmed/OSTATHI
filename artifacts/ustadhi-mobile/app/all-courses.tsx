import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { CourseCard } from '@/components/CourseCard';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { useGetCourses, useGetSubjects, useGetTeachers, useGetStudentCourses } from '@workspace/api-client-react';

type SortKey = 'newest' | 'oldest' | 'title';

export default function AllCoursesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { user, isLoggedIn } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);
  const [teacherFilter, setTeacherFilter] = useState<number | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [pendingCourseId, setPendingCourseId] = useState<number | null>(null);

  // All published + unpublished courses (admin sees all; guests/students browse all)
  const { data: courses, isLoading, refetch } = useGetCourses();
  const { data: subjects } = useGetSubjects();
  const { data: teachers } = useGetTeachers();

  // For students: fetch enrolled course IDs
  const studentId = user?.role === 'student' ? user.id : undefined;
  const { data: enrolledCourses } = useGetStudentCourses(studentId as number, { query: { enabled: !!studentId } });
  const enrolledIds = new Set((enrolledCourses ?? []).map((c: any) => c.id));

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Unique grade levels from courses
  const gradeLevels = useMemo(() => {
    const seen = new Set<string>();
    (courses ?? []).forEach((c) => { if ((c as any).gradeLevel) seen.add((c as any).gradeLevel); });
    return [...seen];
  }, [courses]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...(courses ?? [])];
    if (subjectFilter) list = list.filter((c) => c.subjectId === subjectFilter);
    if (teacherFilter) list = list.filter((c) => c.teacherId === teacherFilter);
    if (gradeFilter) list = list.filter((c) => (c as any).gradeLevel === gradeFilter);
    if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
    else if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime());
    else if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
    return list;
  }, [courses, subjectFilter, teacherFilter, gradeFilter, sort]);

  const activeFiltersCount = (subjectFilter ? 1 : 0) + (teacherFilter ? 1 : 0) + (gradeFilter ? 1 : 0);

  const clearAll = () => {
    setSubjectFilter(null);
    setTeacherFilter(null);
    setGradeFilter(null);
  };

  const handleCoursePress = (courseId: number) => {
    if (!isLoggedIn) {
      setPendingCourseId(courseId);
      setShowLoginGate(true);
      return;
    }
    // Students: only enrolled courses
    if (user?.role === 'student' && !enrolledIds.has(courseId)) {
      setPendingCourseId(courseId);
      setShowLoginGate(true);
      return;
    }
    router.push(`/course/${courseId}` as any);
  };

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      <View style={[S.topBar, { paddingTop: topPad + 14, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[S.title, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          جميع الدورات
        </Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[S.filterBtn, { backgroundColor: activeFiltersCount > 0 ? colors.primary : colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="options-outline" size={18} color={activeFiltersCount > 0 ? colors.primaryForeground : colors.foreground} />
          {activeFiltersCount > 0 && (
            <View style={[S.filterBadge, { backgroundColor: '#D4A843' }]}>
              <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Tajawal_700Bold' }}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Filter panel ── */}
      {showFilters && (
        <View style={[S.filterPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* Sort */}
          <View style={S.filterSection}>
            <Text style={[S.filterLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>الترتيب</Text>
            <View style={S.pillRow}>
              {([
                { key: 'newest', label: 'الأحدث' },
                { key: 'oldest', label: 'الأقدم' },
                { key: 'title', label: 'الاسم أ-ي' },
              ] as { key: SortKey; label: string }[]).map((s) => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setSort(s.key)}
                  style={[S.pill, { backgroundColor: sort === s.key ? colors.primary : colors.background, borderColor: sort === s.key ? colors.primary : colors.border }]}
                >
                  <Text style={[S.pillText, { color: sort === s.key ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subject filter */}
          {(subjects ?? []).length > 0 && (
            <View style={S.filterSection}>
              <Text style={[S.filterLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>المادة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.pillRow}>
                <TouchableOpacity
                  onPress={() => setSubjectFilter(null)}
                  style={[S.pill, { backgroundColor: !subjectFilter ? colors.primary : colors.background, borderColor: !subjectFilter ? colors.primary : colors.border }]}
                >
                  <Text style={[S.pillText, { color: !subjectFilter ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>الكل</Text>
                </TouchableOpacity>
                {(subjects ?? []).map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSubjectFilter(subjectFilter === s.id ? null : s.id)}
                    style={[S.pill, { backgroundColor: subjectFilter === s.id ? colors.primary : colors.background, borderColor: subjectFilter === s.id ? colors.primary : colors.border }]}
                  >
                    {s.icon ? <Text style={{ fontSize: 12 }}>{s.icon}</Text> : null}
                    <Text style={[S.pillText, { color: subjectFilter === s.id ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Teacher filter */}
          {(teachers ?? []).length > 0 && (
            <View style={S.filterSection}>
              <Text style={[S.filterLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>الأستاذ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.pillRow}>
                <TouchableOpacity
                  onPress={() => setTeacherFilter(null)}
                  style={[S.pill, { backgroundColor: !teacherFilter ? colors.primary : colors.background, borderColor: !teacherFilter ? colors.primary : colors.border }]}
                >
                  <Text style={[S.pillText, { color: !teacherFilter ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>الكل</Text>
                </TouchableOpacity>
                {(teachers ?? []).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setTeacherFilter(teacherFilter === t.id ? null : t.id)}
                    style={[S.pill, { backgroundColor: teacherFilter === t.id ? colors.primary : colors.background, borderColor: teacherFilter === t.id ? colors.primary : colors.border }]}
                  >
                    <Text style={[S.pillText, { color: teacherFilter === t.id ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                      {t.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Grade filter */}
          {gradeLevels.length > 0 && (
            <View style={S.filterSection}>
              <Text style={[S.filterLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>الصف</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.pillRow}>
                <TouchableOpacity
                  onPress={() => setGradeFilter(null)}
                  style={[S.pill, { backgroundColor: !gradeFilter ? colors.primary : colors.background, borderColor: !gradeFilter ? colors.primary : colors.border }]}
                >
                  <Text style={[S.pillText, { color: !gradeFilter ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>الكل</Text>
                </TouchableOpacity>
                {gradeLevels.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGradeFilter(gradeFilter === g ? null : g)}
                    style={[S.pill, { backgroundColor: gradeFilter === g ? colors.primary : colors.background, borderColor: gradeFilter === g ? colors.primary : colors.border }]}
                  >
                    <Text style={[S.pillText, { color: gradeFilter === g ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Clear all */}
          {activeFiltersCount > 0 && (
            <TouchableOpacity onPress={clearAll} style={[S.clearBtn, { borderColor: colors.border }]}>
              <Ionicons name="close-circle-outline" size={16} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>مسح الفلاتر</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Results count ── */}
      <View style={[S.resultsBar, { borderBottomColor: colors.border }]}>
        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
          {isLoading ? '...' : `${filtered.length} دورة`}
        </Text>
        {activeFiltersCount > 0 && (
          <TouchableOpacity onPress={clearAll}>
            <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>مسح الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── List ── */}
      <FlatList
        data={isLoading ? [] : filtered}
        keyExtractor={(c) => String(c.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 + insets.bottom, alignItems: 'center', gap: 16 }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: 16, width: '100%', paddingHorizontal: 20 }}>
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <View style={S.empty}>
              <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, textAlign: 'center' }]}>
                لا توجد دورات تطابق بحثك
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <CourseCard
            title={item.title}
            teacherName={(item as any).teacherName}
            teacherAvatarUrl={(item as any).teacherAvatarUrl}
            subjectName={(item as any).subjectName}
            gradeLevel={(item as any).gradeLevel}
            thumbnailUrl={(item as any).thumbnailUrl}
            lessonsCount={item.lessonsCount}
            onPress={() => handleCoursePress(item.id)}
          />
        )}
      />

      {/* ── Login / Not-enrolled gate ── */}
      <Modal
        visible={showLoginGate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginGate(false)}
      >
        <TouchableOpacity
          style={S.overlay}
          activeOpacity={1}
          onPress={() => setShowLoginGate(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[S.gateCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[S.gateIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="lock-closed" size={36} color={colors.primary} />
            </View>

            <Text style={[S.gateTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 19 * fs }]}>
              {!isLoggedIn ? 'سجّل دخولك أولاً' : 'غير مشترك في هذه الدورة'}
            </Text>
            <Text style={[S.gateBody, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
              {!isLoggedIn
                ? 'يجب تسجيل الدخول لمشاهدة تفاصيل الدورة'
                : 'هذه الدورة غير مربوطة بحسابك.\nتواصل مع إدارة المنصة لتفعيل اشتراكك.'}
            </Text>

            {!isLoggedIn && (
              <TouchableOpacity
                style={[S.gateBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowLoginGate(false);
                  router.push('/login' as any);
                }}
              >
                <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                  تسجيل الدخول
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setShowLoginGate(false)} style={S.gateCancel}>
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center' },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12,
  },
  filterSection: { gap: 8, paddingHorizontal: 16 },
  filterLabel: {},
  pillRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {},
  clearBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  resultsBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  empty: { alignItems: 'center', gap: 12, marginTop: 80, paddingHorizontal: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  gateCard: { width: '100%', borderRadius: 28, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  gateIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  gateTitle: { textAlign: 'center' },
  gateBody: { textAlign: 'center', lineHeight: 22 },
  gateBtn: { width: '100%', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: 6 },
  gateCancel: { paddingVertical: 8, paddingHorizontal: 16 },
});
