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
import { BannerCarousel } from '@/components/BannerCarousel';

const SOCIAL_LINKS = [
  { icon: 'logo-instagram' as const, label: 'انستقرام', color: '#e1306c' },
  { icon: 'logo-whatsapp' as const, label: 'واتساب', color: '#25d366' },
  { icon: 'logo-youtube' as const, label: 'يوتيوب', color: '#ff0000' },
];

function useBanners() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<{ id: number; imageUrl: string; linkUrl: string | null }[]>({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/banners`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
}

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
                  subjectImageUrl={(item as any).subjectImageUrl}
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
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fs = fontScale;

  const { data: subjects, isLoading: sl, refetch: refetchS } = useGetSubjects();
  const { data: allTeachers, refetch: refetchT } = useGetTeachers();
  const { data: courses, isLoading: cl, refetch: refetchC } = useGetCourses({ isPublished: true } as any);
  const { data: reviews, isLoading: rl, refetch: refetchR } = useGetReviews({ isPublished: true });
  const { data: banners = [] } = useBanners();

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

        {/* Banner carousel */}
        {banners.length > 0 && <BannerCarousel banners={banners} autoPlayMs={4000} />}

        {/* Subjects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>المواد الدراسية</Text>
            <TouchableOpacity onPress={() => router.push('/subjects' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Tajawal_500Medium' }]}>الكل</Text>
            </TouchableOpacity>
          </View>
          {sl ? (
            <FlatList horizontal inverted data={[1, 2, 3, 4]} keyExtractor={String} renderItem={() => <SkeletonCard />} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList} />
          ) : (subjects ?? []).length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', textAlign: 'right', paddingHorizontal: 16 }]}>لا توجد مواد</Text>
          ) : (
            <FlatList
              horizontal inverted
              data={subjects ?? []}
              keyExtractor={(s) => String(s.id)}
              renderItem={({ item }) => (
                <SubjectCard
                  name={item.name} icon={item.icon} imageUrl={(item as any).imageUrl}
                  gradeLevel={item.gradeLevel} isSelected={false}
                  onPress={() => router.push(`/subject/${item.id}` as any)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          )}
        </View>

        {/* Courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>دوراتنا</Text>
            <TouchableOpacity onPress={() => router.push('/all-courses' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Tajawal_500Medium' }]}>عرض الكل</Text>
            </TouchableOpacity>
          </View>
          {cl ? (
            <FlatList horizontal inverted data={[1, 2, 3]} keyExtractor={String} renderItem={() => <SkeletonCard />} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList} />
          ) : (courses ?? []).length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', textAlign: 'right', paddingHorizontal: 16 }]}>لا توجد دورات حالياً</Text>
          ) : (
            <FlatList
              horizontal inverted
              data={(courses ?? []).slice(0, 10)}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <CourseCard
                  title={item.title}
                  teacherName={(item as any).teacherName}
                  teacherAvatarUrl={(item as any).teacherAvatarUrl}
                  subjectName={(item as any).subjectName}
                  subjectImageUrl={(item as any).subjectImageUrl}
                  gradeLevel={(item as any).gradeLevel}
                  thumbnailUrl={(item as any).thumbnailUrl}
                  lessonsCount={item.lessonsCount}
                  onPress={() => router.push(`/course/${item.id}`)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.hList, { paddingRight: 16 }]}
            />
          )}
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>آراء الطلاب</Text>
          </View>
          {rl ? (
            <FlatList horizontal inverted data={[1, 2, 3]} keyExtractor={String} renderItem={() => <SkeletonCard />} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList} />
          ) : (reviews ?? []).filter((r) => r.isPublished).length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', textAlign: 'right', paddingHorizontal: 16 }]}>لا توجد آراء حتى الآن</Text>
          ) : (
            <FlatList
              horizontal inverted
              data={(reviews ?? []).filter((r) => r.isPublished)}
              keyExtractor={(r) => String(r.id)}
              renderItem={({ item }) => (
                <ReviewCard studentName={item.studentName} comment={item.comment} rating={item.rating} createdAt={item.createdAt} />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
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
// ADMIN HOME DASHBOARD
// ─────────────────────────────────────────────
function useAdminStats(adminToken: string | undefined) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<{ totalStudents: number; totalTeachers: number; totalCourses: number }>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/mobile/admin/stats`, {
        headers: { 'x-admin-token': adminToken ?? '' },
      });
      if (!res.ok) return { totalStudents: 0, totalTeachers: 0, totalCourses: 0 };
      return res.json();
    },
    enabled: !!adminToken,
  });
}

function AdminHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch } = useAdminStats((user as any)?.adminToken);

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const statCards = [
    { value: stats?.totalStudents ?? '—', label: 'طالب', icon: 'people' as const, color: '#3b82f6' },
    { value: stats?.totalTeachers ?? '—', label: 'أستاذ', icon: 'person' as const, color: '#10b981' },
    { value: stats?.totalCourses ?? '—', label: 'كورس', icon: 'book' as const, color: '#f59e0b' },
  ];

  const quickActions = [
    { icon: 'people' as const, label: 'الطلاب', color: '#3b82f6', route: '/(tabs)/students' },
    { icon: 'book' as const, label: 'الكورسات', color: '#f59e0b', route: '/(tabs)/courses' },
    { icon: 'chatbubble-ellipses' as const, label: 'الرسائل', color: '#8b5cf6', route: '/(tabs)/chat' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Admin hero */}
        <LinearGradient
          colors={['#101D36', '#1e3a6e', '#2d5299']}
          style={[styles.teacherHero, { paddingTop: topPad + 20 }]}
        >
          <View style={[styles.teacherAvatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="shield-checkmark" size={32} color="#D4A843" />
          </View>
          <Text style={[{ fontFamily: 'Tajawal_900Black', color: '#fff', fontSize: 20 * fs }]}>
            لوحة تحكم المدير
          </Text>
          <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 13 * fs }]}>
            منصة استاذي التعليمية
          </Text>

          {/* Stats row */}
          <View style={styles.teacherStatsRow}>
            {statCards.map((s) => (
              <View key={s.label} style={styles.teacherStatItem}>
                <Text style={[{ fontFamily: 'Tajawal_700Bold', color: '#D4A843', fontSize: 26 * fs }]}>{String(s.value)}</Text>
                <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12 * fs }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {quickActions.map((a) => (
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
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// PARENT HOME — معلومات الطفل الكاملة
// ─────────────────────────────────────────────
function useParentChild(parentId: number | undefined, parentToken: string | undefined) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<{
    student: { id: number; fullName: string; gradeLevel: string; isActive: boolean; notes: string | null };
    courses: { id: number; title: string; description: string | null }[];
  }>({
    queryKey: ['parent-child', parentId],
    queryFn: async () => {
      const res = await fetch(`${base}/api/mobile/parent/child`, {
        headers: { 'x-parent-id': String(parentId), 'x-parent-token': parentToken ?? '' },
      });
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    enabled: !!parentId && !!parentToken,
  });
}

function ParentHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useParentChild(user?.id, (user as any)?.parentToken);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };
  const student = data?.student;
  const courses = data?.courses ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Parent hero */}
        <LinearGradient
          colors={['#101D36', '#1e3a6e', '#2d5299']}
          style={[styles.teacherHero, { paddingTop: topPad + 20 }]}
        >
          <View style={[styles.teacherAvatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="people" size={32} color="#D4A843" />
          </View>
          <Text style={[{ fontFamily: 'Tajawal_900Black', color: '#fff', fontSize: 20 * fs }]}>
            {user?.fullName}
          </Text>
          <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 13 * fs }]}>
            ولي أمر
          </Text>
          {student && (
            <View style={styles.teacherStatsRow}>
              <View style={styles.teacherStatItem}>
                <Text style={[{ fontFamily: 'Tajawal_700Bold', color: '#D4A843', fontSize: 22 * fs }]}>{student.gradeLevel}</Text>
                <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12 * fs }]}>الصف</Text>
              </View>
              <View style={styles.teacherStatItem}>
                <Text style={[{ fontFamily: 'Tajawal_700Bold', color: '#D4A843', fontSize: 22 * fs }]}>{courses.length}</Text>
                <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12 * fs }]}>كورس</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Child info */}
        {student && (
          <View style={{ marginHorizontal: 16, marginTop: 16, gap: 12 }}>
            <View style={[{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 16, gap: 10 }]}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs, textAlign: 'right' }]}>معلومات الطالب</Text>
              {[
                { label: 'الاسم', value: student.fullName },
                { label: 'الصف', value: student.gradeLevel },
                { label: 'الحالة', value: student.isActive ? '✅ مفعّل' : '🔴 موقوف' },
              ].map(row => (
                <View key={row.label} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                  <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>{row.label}</Text>
                  <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>{row.value}</Text>
                </View>
              ))}
              {student.notes && (
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right', lineHeight: 20, marginTop: 4 }]}>
                  📝 {student.notes}
                </Text>
              )}
            </View>

            {/* Courses */}
            <View style={[{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 16, gap: 10 }]}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs, textAlign: 'right' }]}>
                الكورسات المسجّل بها ({courses.length})
              </Text>
              {courses.length === 0 ? (
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right' }]}>
                  لم يُسجَّل في أي كورس بعد
                </Text>
              ) : (
                courses.map(c => (
                  <View key={c.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                    <Ionicons name="book-outline" size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, textAlign: 'right' }]}>{c.title}</Text>
                      {c.description && (
                        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]} numberOfLines={1}>{c.description}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {isLoading && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>جاري التحميل...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT — role-aware
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminHome />;
  if (user?.role === 'teacher') return <TeacherHome />;
  if (user?.role === 'parent') return <ParentHome />;
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
  socialBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  socialLabel: {},
  // Teacher-specific
  teacherHero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center', gap: 8 },
  teacherAvatar: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  teacherStatsRow: { flexDirection: 'row-reverse', gap: 40, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', width: '100%', justifyContent: 'center' },
  teacherStatItem: { alignItems: 'center', gap: 2 },
  quickActions: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 12, marginTop: 18, paddingHorizontal: 16 },
  quickActionBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 28, borderWidth: 1 },
  emptyAction: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 16, borderRadius: 28, borderWidth: 1 },
  studentRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 26, borderWidth: 1 },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
