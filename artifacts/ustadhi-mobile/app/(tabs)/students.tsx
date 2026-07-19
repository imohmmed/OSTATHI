import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { SkeletonRow } from '@/components/SkeletonLoader';
import { useQuery } from '@tanstack/react-query';

interface StudentItem {
  id: number;
  fullName: string;
  phone: string;
  gradeLevel: string;
  parentName?: string | null;
  parentPhone?: string | null;
  isActive: boolean;
  notes?: string | null;
  enrolledCourseIds: number[];
}

function useTeacherStudents(teacherId: number | undefined) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<StudentItem[]>({
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

export default function StudentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fontScale } = useApp();
  const fs = fontScale;
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: students, isLoading, refetch } = useTeacherStudents(
    user?.role === 'teacher' ? user.id : undefined
  );

  const filtered = (students ?? []).filter((s) =>
    s.fullName.includes(search) || s.gradeLevel.includes(search)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          طلابي
        </Text>
        {!isLoading && (
          <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.countText, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
              {students?.length ?? 0}
            </Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="بحث عن طالب..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
          textAlign="right"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => String(s.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/student/${item.id}`)}
            activeOpacity={0.75}
            style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.studentAvatar, { backgroundColor: item.isActive ? colors.primary : colors.muted }]}>
              <Text style={[styles.avatarInitial, { color: item.isActive ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs }]}>
                {item.fullName[0]}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={[styles.studentName, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                {item.fullName}
              </Text>
              <View style={styles.studentMeta}>
                <View style={[styles.gradePill, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.gradeText, { color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>
                    {item.gradeLevel}
                  </Text>
                </View>
                <Text style={[styles.coursesCount, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
                  {item.enrolledCourseIds?.length ?? 0} كورس
                </Text>
              </View>
            </View>
            {!item.isActive && (
              <View style={[styles.inactiveBadge, { backgroundColor: colors.destructive + '20' }]}>
                <Text style={[styles.inactiveText, { color: colors.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>
                  موقوف
                </Text>
              </View>
            )}
            <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          isLoading ? <>{[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}</> : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                {search ? 'لا توجد نتائج' : 'لم يُضف لك أي طالب بعد'}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
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
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText: {},
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1 },
  studentCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {},
  studentInfo: { flex: 1, gap: 6 },
  studentName: { textAlign: 'right' },
  studentMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  gradePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 14 },
  gradeText: {},
  coursesCount: {},
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  inactiveText: {},
  emptyContainer: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText: { textAlign: 'center' },
});
