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
import { useColorScheme } from 'react-native';
import { SubjectCard } from '@/components/SubjectCard';
import { TeacherCard } from '@/components/TeacherCard';
import { CourseCard } from '@/components/CourseCard';
import { ReviewCard } from '@/components/ReviewCard';
import { SkeletonCard, SkeletonRow } from '@/components/SkeletonLoader';
import { useApp } from '@/contexts/AppContext';
import {
  useGetSubjects,
  useGetTeachers,
  useGetCourses,
  useGetReviews,
} from '@workspace/api-client-react';

const SOCIAL_LINKS = [
  { icon: 'logo-instagram' as const, label: 'انستقرام', color: '#e1306c' },
  { icon: 'logo-whatsapp' as const, label: 'واتساب', color: '#25d366' },
  { icon: 'logo-youtube' as const, label: 'يوتيوب', color: '#ff0000' },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale, setThemeMode, effectiveTheme } = useApp();
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

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

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, 1], extrapolate: 'clamp' });

  const fs = fontScale;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky compact header (appears on scroll) */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            opacity: headerOpacity,
            paddingTop: insets.top,
            ...(Platform.OS === 'web' ? { paddingTop: insets.top + 67 } : {}),
          },
        ]}
        pointerEvents="none"
      >
        <Text style={[styles.stickyTitle, { color: colors.primary, fontFamily: 'Tajawal_700Bold' }]}>
          استاذي
        </Text>
      </Animated.View>

      {/* Theme toggle button */}
      <View
        style={[
          styles.themeBtn,
          {
            top: insets.top + (Platform.OS === 'web' ? 67 : 0) + 12,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark')}
          style={[styles.themePill, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons
            name={effectiveTheme === 'dark' ? 'sunny' : 'moon'}
            size={18}
            color={colors.foreground}
          />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* HERO */}
        <LinearGradient
          colors={['#101D36', '#1e3a6e', '#2d5299']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 20 }]}
        >
          <Text style={[styles.heroLogo, { fontFamily: 'Tajawal_900Black', color: '#fff' }]}>
            استاذي
          </Text>
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
                <Text style={[styles.statValue, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs }]}>
                  {s.value}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12 * fs }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* SUBJECTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs }]}>
              المواد الدراسية
            </Text>
            {selectedSubjectId && (
              <TouchableOpacity onPress={() => setSelectedSubjectId(null)}>
                <Text style={[styles.clearFilter, { color: colors.primary, fontFamily: 'Tajawal_500Medium' }]}>
                  الكل
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {sl ? (
            <FlatList
              horizontal
              inverted
              data={[1, 2, 3, 4]}
              keyExtractor={(i) => String(i)}
              renderItem={() => <SkeletonCard />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          ) : (
            <FlatList
              horizontal
              inverted
              data={subjects ?? []}
              keyExtractor={(s) => String(s.id)}
              renderItem={({ item }) => (
                <SubjectCard
                  name={item.name}
                  icon={item.icon}
                  gradeLevel={item.gradeLevel}
                  isSelected={selectedSubjectId === item.id}
                  onPress={() => setSelectedSubjectId(selectedSubjectId === item.id ? null : item.id)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
                  لا توجد مواد
                </Text>
              }
            />
          )}
        </View>

        {/* TEACHERS */}
        {selectedSubjectId && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs, paddingHorizontal: 16, marginBottom: 12 }]}>
              الأساتذة
            </Text>
            {tl
              ? [1, 2].map((i) => <SkeletonRow key={i} />)
              : (allTeachers ?? []).map((t) => (
                  <TeacherCard
                    key={t.id}
                    fullName={t.fullName}
                    bio={t.bio}
                    avatarUrl={t.avatarUrl}
                    onPress={() => router.push(`/teacher/${t.id}`)}
                  />
                ))}
          </View>
        )}

        {/* COURSES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs }]}>
              دوراتنا
            </Text>
          </View>
          {cl ? (
            <FlatList
              horizontal
              inverted
              data={[1, 2, 3]}
              keyExtractor={(i) => String(i)}
              renderItem={() => <SkeletonCard />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          ) : (
            <FlatList
              horizontal
              inverted
              data={(courses ?? []).slice(0, 10)}
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
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
                  لا توجد دورات حالياً
                </Text>
              }
            />
          )}
        </View>

        {/* REVIEWS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs, paddingHorizontal: 16, marginBottom: 12 }]}>
            آراء الطلاب
          </Text>
          {rl ? (
            <FlatList
              horizontal
              inverted
              data={[1, 2, 3]}
              keyExtractor={(i) => String(i)}
              renderItem={() => <SkeletonCard />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          ) : (
            <FlatList
              horizontal
              inverted
              data={(reviews ?? []).filter((r) => r.isPublished)}
              keyExtractor={(r) => String(r.id)}
              renderItem={({ item }) => (
                <ReviewCard
                  studentName={item.studentName}
                  comment={item.comment}
                  rating={item.rating}
                  createdAt={item.createdAt}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
                  لا توجد آراء حتى الآن
                </Text>
              }
            />
          )}
        </View>

        {/* SOCIAL */}
        <View style={styles.social}>
          <Text style={[styles.socialTitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
            تابعنا على
          </Text>
          <View style={styles.socialRow}>
            {SOCIAL_LINKS.map((s) => (
              <TouchableOpacity key={s.label} style={[styles.socialBtn, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
                <Text style={[styles.socialLabel, { color: s.color, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  stickyTitle: { fontSize: 20 },
  themeBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
  },
  themePill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
    gap: 10,
  },
  heroLogo: { fontSize: 36, letterSpacing: 1 },
  heroTagline: { textAlign: 'center', lineHeight: 24 },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 30,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    justifyContent: 'center',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontWeight: 'bold' },
  statLabel: {},
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {},
  clearFilter: { fontSize: 14 },
  hList: { paddingRight: 16, paddingLeft: 4 },
  empty: { fontSize: 14, padding: 16 },
  social: { alignItems: 'center', gap: 12, marginTop: 30, paddingBottom: 10 },
  socialTitle: {},
  socialRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  socialBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  socialLabel: {},
});
