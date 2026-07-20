import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

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

function useAdminStudents(adminToken: string | undefined) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<StudentItem[]>({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/mobile/admin/students`, {
        headers: { 'x-admin-token': adminToken ?? '' },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!adminToken,
  });
}

const GRADE_LEVELS = [
  'سادس ابتدائي',
  'اول متوسط', 'ثاني متوسط', 'ثالث متوسط',
  'رابع اعدادي علمي', 'رابع اعدادي ادبي',
  'خامس اعدادي علمي', 'خامس اعدادي ادبي',
  'سادس اعدادي علمي', 'سادس اعدادي ادبي',
];

function useCreateStudent(adminToken: string | undefined) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fullName: string; username: string; password: string; gradeLevel: string; phone?: string; notes?: string }) => {
      const res = await fetch(`${base}/api/mobile/admin/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-students'] }),
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
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', gradeLevel: '', notes: '' });
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const isAdmin = user?.role === 'admin';

  const teacherQ = useTeacherStudents(user?.role === 'teacher' ? user.id : undefined);
  const adminQ = useAdminStudents(isAdmin ? (user as any).adminToken : undefined);
  const { data: students, isLoading, refetch } = isAdmin ? adminQ : teacherQ;
  const createStudent = useCreateStudent(isAdmin ? (user as any).adminToken : undefined);

  const filtered = (students ?? []).filter((s) =>
    s.fullName.includes(search) || s.gradeLevel.includes(search)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!form.fullName || !form.username || !form.password || !form.gradeLevel) {
      Alert.alert('خطأ', 'الاسم واسم الدخول وكلمة المرور والصف مطلوبة');
      return;
    }
    try {
      await createStudent.mutateAsync({ ...form });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreate(false);
      setForm({ fullName: '', username: '', password: '', phone: '', gradeLevel: '', notes: '' });
      refetch();
    } catch (e: any) { Alert.alert('خطأ', e.message); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          {isAdmin ? 'كل الطلاب' : 'طلابي'}
        </Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={[styles.countBadge, { backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12 }]}
            >
              <Ionicons name="add" size={16} color={colors.primaryForeground} />
              <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>جديد</Text>
            </TouchableOpacity>
          )}
          {!isLoading && (
            <View style={[styles.countBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.countText, { color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                {students?.length ?? 0}
              </Text>
            </View>
          )}
        </View>
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
            onPress={() => isAdmin
              ? router.push({ pathname: '/admin/student-detail/[id]' as any, params: { id: item.id } })
              : router.push(`/student/${item.id}`)
            }
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

      {/* Create Student Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={[{ color: colors.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>طالب جديد</Text>
            <TouchableOpacity onPress={handleCreate} disabled={createStudent.isPending}>
              <Text style={[{ color: createStudent.isPending ? colors.mutedForeground : colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                {createStudent.isPending ? '...' : 'إنشاء'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
            {[
              { label: 'الاسم الثلاثي *', key: 'fullName', placeholder: 'اسم الطالب كاملاً' },
              { label: 'اسم الدخول (يوزر أو إيميل) *', key: 'username', placeholder: 'مثال: student1' },
              { label: 'كلمة المرور *', key: 'password', placeholder: 'كلمة المرور', secure: true },
              { label: 'رقم الجوال', key: 'phone', placeholder: 'اختياري' },
              { label: 'ملاحظات', key: 'notes', placeholder: 'اختياري', multiline: true },
            ].map(f => (
              <View key={f.key} style={{ gap: 6 }}>
                <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>{f.label}</Text>
                <TextInput
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!!(f as any).secure}
                  multiline={!!(f as any).multiline}
                  textAlign="right"
                  style={[styles.input, {
                    color: colors.foreground, borderColor: colors.border,
                    backgroundColor: colors.card, fontFamily: 'Tajawal_400Regular',
                    fontSize: 14 * fs, minHeight: (f as any).multiline ? 80 : 48,
                  }]}
                />
              </View>
            ))}
            {/* Grade */}
            <View style={{ gap: 8 }}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>الصف الدراسي *</Text>
              <View style={styles.gradesGrid}>
                {GRADE_LEVELS.map(g => {
                  const sel = form.gradeLevel === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setForm(p => ({ ...p, gradeLevel: g }))}
                      style={[styles.gradePillBtn, { backgroundColor: sel ? colors.primary : colors.card, borderColor: sel ? colors.primary : colors.border }]}
                    >
                      <Text style={[{ color: sel ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
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
    borderRadius: 26,
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
  gradePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  gradeText: {},
  coursesCount: {},
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  inactiveText: {},
  emptyContainer: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText: { textAlign: 'center' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top' },
  gradesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  gradePillBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
