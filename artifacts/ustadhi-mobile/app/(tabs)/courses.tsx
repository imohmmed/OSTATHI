import React from 'react';
import {
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
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { CourseCard } from '@/components/CourseCard';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { useGetStudentCourses } from '@workspace/api-client-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

// Progress stored locally: { [courseId]: number (0–100) }
const PROGRESS_KEY = '@ustadhi_progress';

function useLocalProgress() {
  return useQuery({
    queryKey: ['local-progress'],
    queryFn: async () => {
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      return raw ? (JSON.parse(raw) as Record<number, number>) : {};
    },
  });
}

export default function CoursesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn } = useAuth();
  const { fontScale } = useApp();
  const fs = fontScale;

  const studentId = user?.role === 'student' ? user.id : undefined;
  const {
    data: courses,
    isLoading,
    refetch,
  } = useGetStudentCourses(studentId as number, { query: { enabled: !!studentId } });

  const { data: progress } = useLocalProgress();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
          <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
            كورساتي
          </Text>
        </View>
        <View style={styles.gateContainer}>
          <View style={[styles.gateIcon, { backgroundColor: colors.muted }]}>
            <Ionicons name="lock-closed" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.gateTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
            سجّل دخولك أولاً
          </Text>
          <Text style={[styles.gateSub, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
            يجب تسجيل الدخول لعرض الكورسات المخصصة لك
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/login')}
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.loginBtnText, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
              تسجيل الدخول
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
            كورساتي
          </Text>
          <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
            مرحباً، {user?.fullName}
          </Text>
        </View>
        {user?.gradeLevel && (
          <View style={[styles.gradeBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.gradeText, { color: colors.primaryForeground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
              {user.gradeLevel}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 16 }}
      >
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={{ marginHorizontal: 16, marginBottom: 12 }}>
              <SkeletonCard />
            </View>
          ))
        ) : !courses?.length ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}>
              لم يُضف لك أي كورس بعد
            </Text>
          </View>
        ) : (
          (courses ?? []).map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              teacherName={course.teacherName}
              subjectName={course.subjectName}
              lessonsCount={course.lessonsCount}
              progress={progress?.[course.id] ?? 0}
              onPress={() => router.push(`/course/${course.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
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
  screenTitle: {},
  greeting: {},
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  gradeText: {},
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 16,
  },
  gateIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateTitle: { textAlign: 'center' },
  gateSub: { textAlign: 'center', lineHeight: 22 },
  loginBtn: {
    marginTop: 8,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  loginBtnText: {},
  emptyContainer: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText: { textAlign: 'center' },
});
