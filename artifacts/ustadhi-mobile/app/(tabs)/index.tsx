import React, { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { SubjectCard } from '@/components/SubjectCard';
import { TeacherCard } from '@/components/TeacherCard';
import { CourseCard } from '@/components/CourseCard';
import { ReviewCard } from '@/components/ReviewCard';
import { SkeletonCard, SkeletonRow } from '@/components/SkeletonLoader';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGetSubjects,
  useGetTeachers,
  useGetCourses,
  useGetReviews,
} from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';

const SOCIAL_LINKS = [
  { icon: 'logo-instagram' as const, label: 'انستقرام', color: '#e1306c' },
  { icon: 'logo-whatsapp' as const, label: 'واتساب', color: '#25d366' },
  { icon: 'logo-youtube' as const, label: 'يوتيوب', color: '#ff0000' },
];

function useTeacherStudents(teacherId: number | undefined) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<{ id: number; fullName: string; gradeLevel: string; enrolledCourseIds: number[] }[]>({
    queryKey: ['teacher-students', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const res = await fetch(`${base}/api/teachers/${teacherId}/students`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!teacherId,
  });
}

// ─────────────────────────────────────────────
// TEACHER HOME DASHBOARD
// ─────────────────────────────────────────────
function TeacherHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: courses, isLoading: cl, refetch: refetchC } = useGetCourses({ teacherId: user!.id });
  const { data: students, isLoading: sl, refetch: refetchS } = useTeacherStudents(user!.id);
  const { data: subjects } = useGetSubjects();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchC(), refetchS()]);
    setRefreshing(false);
  };

  const subjectNames = (user as any)?.subjects?.map((s: any) => s.name).join(' · ') ?? '';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Teacher hero banner */}
        <LinearGradient
          colors={['#101D36', '#1e3a6e', '#2d5299']}
          style={[styles.teacherHero, { paddingTop: topPad + 20 }]}
        >
          <View style={[styles.teacherAvatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={[{ fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 28 }]}>
              {user!.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('')}
            </Text>
          </View>
          <Text style={[{ fontFamily: 'Tajawal_900Black', color: '#fff', fontSize: 20 * fs }]}>
            أهلاً، {user!.fullName}
          </Text>
          <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 13 * fs, textAlign: 'center' }]}>
            لوحة تحكم الأستاذ
          </Text>

          {/* Stats */}
          <View style={styles.teacherStatsRow}>
            {[
              { value: String(students?.length ?? 0), label: 'طالب' },
              { value: String(courses?.length ?? 0), label: 'كورس' },
            ].map((s) => (
              <View key={s.label} style={styles.teacherStatItem}>
                <Text style={[{ fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 24 * fs }]}>{s.value}</Text>
                <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12 * fs }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'book' as const, label: 'كورساتي', color: '#3b82f6', route: '/(tabs)/courses' },
            { icon: 'people' as const, label: 'طلابي', color: '#10b981', route: '/(tabs)/students' },
            { icon: 'chatbubble-ellipses' as const, label: 'الرسائل', color: '#8b5cf6', route: '/(tabs)/chat' },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => router.push(a.route as any)}
              style={[styles.quickActionBtn, { backgroundColor: a.color + '15', borderColor: a.color + '30' }]}
            >
              <Ionicons name={a.icon} size={24} color={a.color} />
              <Text style={[{ fontFamily: 'Tajawal_500Medium', color: a.color, fontSize: 12 * fs }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
              دوراتي الأخيرة
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/courses' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>عرض الكل</Text>
            </TouchableOpacity>
          </View>
          {cl ? (
            <FlatList
              horizontal inverted
              data={[1, 2]} keyExtractor={String}
              renderItem={() => <SkeletonCard />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          ) : (courses ?? []).length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/courses' as any)}
              style={[styles.emptyAction, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>أنشئ أول كورس لك</Text>
            </TouchableOpacity>
          ) : (
            <FlatList
              horizontal inverted
              data={(courses ?? []).slice(0, 5)}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <CourseCard
                  title={item.title}
                  teacherName={item.teacherName}
                  subjectName={item.subjectName}
                  lessonsCount={item.lessonsCount}
                  isHorizontal
                  onPress={() => router.push(`/course/${item.id}`)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          )}
        </View>

        {/* Recent students */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
              آخر الطلاب
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/students' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>عرض الكل</Text>
            </TouchableOpacity>
          </View>
          {sl ? (
            [1, 2].map((i) => <SkeletonRow key={i} />)
          ) : (students ?? []).slice(0, 4).map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => router.push(`/student/${s.id}`)}
              style={[styles.studentRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.studentAvatar, { backgroundColor: colors.primary }]}>
                <Text style={[{ fontFamily: 'Tajawal_700Bold', color: colors.primaryForeground, fontSize: 16 }]}>{s.fullName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, textAlign: 'right' }]}>{s.fullName}</Text>
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}>{s.gradeLevel}</Text>
              </View>
              <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
          {!sl && (students ?? []).length === 0 && (
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'center', padding: 16 }]}>
              لا يوجد طلاب مشتركون بعد
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// PUBLIC / STUDENT HOME
// ─────────────────────────────────────────────
function StudentHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale, setThemeMode, effectiveTheme } = useApp();
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fs = fontScale;

  const { data: subjects, isLoading: sl, refetch: refetchS } = useGetSubjects();
  const { data: allTeachers, isLoading: tl, refetch: refetchT } = useGetTeachers(
    selectedSubjectId ? { subjectId: selectedSubjectId } : undefined
  );
  const { data: courses, isLoading: cl, refetch: refetchC } = useGetCourses({ isPublished: true });
  const { data: reviews, isLoading: rl, refetch: refetchR } = useGetReviews({ isPublished: true });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchS(), refetchT(), refetchC(), refetchR()]);
    setRefreshing(false);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[styles.stickyHeader, { backgroundColor: colors.background, borderBottomColor: colors.border, opacity: headerOpacity, paddingTop: topPad }]}
        pointerEvents="none"
      >
        <Text style={[styles.stickyTitle, { color: colors.primary, fontFamily: 'Tajawal_700Bold' }]}>استاذي</Text>
      </Animated.View>

      <View style={[styles.themeBtn, { top: topPad + 12 }]}>
        <TouchableOpacity
          onPress={() => setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark')}
          style={[styles.themePill, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name={effectiveTheme === 'dark' ? 'sunny' : 'moon'} size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        <LinearGradient
          colors={['#101D36', '#1e3a6e', '#2d5299']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPad + 20 }]}
        >
          <Text style={[styles.heroLogo, { fontFamily: 'Tajawal_900Black', color: '#fff' }]}>استاذي</Text>
          <Text style={[styles.heroTagline, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.85)', fontSize: 15 * fs }]}>
            نخبة من أفضل أساتذة العراق يقدمون{'\n'}تجربة تعليمية متكاملة
          </Text>
          <View style={styles.statsRow}>
            {[
              { value: (subjects?.length ?? 0) + '+', label: 'مادة' },
              { value: (courses?.length ?? 0) + '+', label: 'دورة' },
              { value: (allTeachers?.length ?? 0) + '+', label: 'أستاذ' },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={[styles.statValue, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12 * fs }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Subjects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>المواد الدراسية</Text>
            {selectedSubjectId && (
              <TouchableOpacity onPress={() => setSelectedSubjectId(null)}>
                <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Tajawal_500Medium' }]}>الكل</Text>
              </TouchableOpacity>
            )}
          </View>
          {sl ? (
            <FlatList horizontal data={[1, 2, 3, 4]} keyExtractor={String} renderItem={() => <SkeletonCard />} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList} />
          ) : (
            <FlatList
              horizontal
              data={subjects ?? []}
              keyExtractor={(s) => String(s.id)}
              renderItem={({ item }) => (
                <SubjectCard
                  name={item.name} icon={item.icon} gradeLevel={item.gradeLevel}
                  isSelected={selectedSubjectId === item.id}
                  onPress={() => setSelectedSubjectId(selectedSubjectId === item.id ? null : item.id)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', textAlign: 'right' }]}>لا توجد مواد</Text>}
            />
          )}
        </View>

        {/* Teachers for selected subject */}
        {selectedSubjectId && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs, paddingHorizontal: 16, marginBottom: 12 }]}>الأساتذة</Text>
            {tl ? [1, 2].map((i) => <SkeletonRow key={i} />) :
              (allTeachers ?? []).map((t) => (
                <TeacherCard key={t.id} fullName={t.fullName} bio={t.bio} avatarUrl={t.avatarUrl}
                  onPress={() => router.push(`/teacher/${t.id}`)} />
              ))}
          </View>
        )}

        {/* Courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>دوراتنا</Text>
          </View>
          {cl ? (
            <FlatList horizontal data={[1, 2, 3]} keyExtractor={String} renderItem={() => <SkeletonCard />} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList} />
          ) : (courses ?? []).length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', textAlign: 'right', paddingHorizontal: 16 }]}>لا توجد دورات حالياً</Text>
          ) : (
            <FlatList
              horizontal
              data={(courses ?? []).slice(0, 10)}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <CourseCard title={item.title} teacherName={item.teacherName} subjectName={item.subjectName}
                  lessonsCount={item.lessonsCount} isHorizontal onPress={() => router.push(`/course/${item.id}`)} />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          )}
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs, paddingHorizontal: 16, marginBottom: 12 }]}>آراء الطلاب</Text>
          {rl ? (
            <FlatList horizontal data={[1, 2, 3]} keyExtractor={String} renderItem={() => <SkeletonCard />} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList} />
          ) : (
            <FlatList
              horizontal
              data={(reviews ?? []).filter((r) => r.isPublished)}
              keyExtractor={(r) => String(r.id)}
              renderItem={({ item }) => (
                <ReviewCard studentName={item.studentName} comment={item.comment} rating={item.rating} createdAt={item.createdAt} />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', textAlign: 'right' }]}>لا توجد آراء حتى الآن</Text>}
            />
          )}
        </View>

        {/* Social links */}
        <View style={styles.social}>
          <Text style={[styles.socialTitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>تابعنا على</Text>
          <View style={styles.socialRow}>
            {SOCIAL_LINKS.map((s) => (
              <TouchableOpacity key={s.label} style={[styles.socialBtn, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
                <Text style={[styles.socialLabel, { color: s.color, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT — role-aware
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <TeacherHome />;
  return <StudentHome />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingBottom: 10, borderBottomWidth: 1, alignItems: 'center' },
  stickyTitle: { fontSize: 20 },
  themeBtn: { position: 'absolute', left: 16, zIndex: 20 },
  themePill: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 20, paddingBottom: 30, alignItems: 'center', gap: 10 },
  heroLogo: { fontSize: 36, letterSpacing: 1 },
  heroTagline: { textAlign: 'center', lineHeight: 24 },
  statsRow: { flexDirection: 'row-reverse', gap: 30, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', width: '100%', justifyContent: 'center' },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: {},
  statLabel: {},
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: {},
  seeAll: { fontSize: 14 },
  hList: { paddingHorizontal: 16, gap: 0 },
  empty: { fontSize: 14, padding: 16 },
  social: { alignItems: 'center', gap: 12, marginTop: 30, paddingBottom: 10 },
  socialTitle: {},
  socialRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  socialBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  socialLabel: {},
  // Teacher-specific
  teacherHero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center', gap: 8 },
  teacherAvatar: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  teacherStatsRow: { flexDirection: 'row-reverse', gap: 40, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', width: '100%', justifyContent: 'center' },
  teacherStatItem: { alignItems: 'center', gap: 2 },
  quickActions: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 12, marginTop: 18, paddingHorizontal: 16 },
  quickActionBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  emptyAction: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 16, borderRadius: 14, borderWidth: 1 },
  studentRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
