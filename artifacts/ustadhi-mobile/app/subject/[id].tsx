import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

interface Teacher {
  id: number;
  fullName: string;
  username: string;
  phone: string;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

interface SubjectDetail {
  id: number;
  name: string;
  icon: string | null;
  gradeLevel: string | null;
  description: string | null;
  teachers: Teacher[];
}

function useSubjectDetail(id: number, _adminToken?: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<SubjectDetail>({
    queryKey: ['subject-detail', id],
    queryFn: async () => {
      const res = await fetch(`${base}/api/subjects/${id}`);
      if (!res.ok) throw new Error('فشل جلب المادة');
      return res.json();
    },
    enabled: !!id,
  });
}

function useCreateTeacher(adminToken: string | undefined) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fullName: string; username: string; password: string; phone?: string; bio?: string; subjectId: number }) => {
      const res = await fetch(`${base}/api/mobile/admin/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'فشل إنشاء الحساب');
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-subject', vars.subjectId] });
    },
  });
}

const GRADE_LEVELS = [
  'سادس ابتدائي',
  'اول متوسط', 'ثاني متوسط', 'ثالث متوسط',
  'رابع اعدادي علمي', 'رابع اعدادي ادبي',
  'خامس اعدادي علمي', 'خامس اعدادي ادبي',
  'سادس اعدادي علمي', 'سادس اعدادي ادبي',
];

export default function SubjectDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const subjectId = parseInt(id, 10);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showLinkTeacher, setShowLinkTeacher] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', bio: '', gradeLevel: '' });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [linkSearch, setLinkSearch] = useState('');

  const adminToken = (user as any)?.adminToken;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  const { data: subject, isLoading, refetch } = useSubjectDetail(subjectId, adminToken);
  const createTeacher = useCreateTeacher(adminToken);

  // Fetch all teachers for link modal
  const { data: allTeachers = [] } = useQuery<{ id: number; fullName: string; username: string }[]>({
    queryKey: ['all-teachers'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/teachers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showLinkTeacher,
  });

  const filteredTeachers = allTeachers.filter(t =>
    t.fullName.includes(linkSearch) || t.username.includes(linkSearch)
  );

  const handleLinkTeacher = async (teacherId: number) => {
    try {
      const res = await fetch(`${base}/api/mobile/admin/subjects/${subjectId}/link-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify({ teacherId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowLinkTeacher(false);
      setLinkSearch('');
      refetch();
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    }
  };

  const handleAddTeacher = async () => {
    if (!form.fullName || !form.username || !form.password) {
      Alert.alert('خطأ', 'الاسم واسم الدخول وكلمة المرور مطلوبة');
      return;
    }
    try {
      await createTeacher.mutateAsync({
        fullName: form.fullName,
        username: form.username,
        password: form.password,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        subjectId,
        gradeLevels: selectedGrades,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddTeacher(false);
      setForm({ fullName: '', username: '', password: '', phone: '', bio: '', gradeLevel: '' });
      setSelectedGrades([]);
      refetch();
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    }
  };

  const toggleGrade = (g: string) => {
    setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: subject?.name ?? decodeURIComponent(name ?? ''), headerBackTitle: 'رجوع' }} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12, borderBottomColor: c.border, backgroundColor: c.background }]}>
        <View style={{ width: 36 }} />
        <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs, flex: 1, textAlign: 'center' }]}>
          {subject?.name ?? decodeURIComponent(name ?? '')}
        </Text>
        {/* Action buttons — admin only */}
        {adminToken ? (
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowAddTeacher(true)}
              style={[styles.addBtn, { backgroundColor: c.primary }]}
            >
              <Ionicons name="add" size={18} color={c.primaryForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowLinkTeacher(true)}
              style={[styles.addBtn, { backgroundColor: `${c.primary}20`, borderWidth: 1, borderColor: c.primary }]}
            >
              <Ionicons name="link" size={16} color={c.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Subject info banner */}
      {subject && (
        <View style={[styles.infoBanner, { backgroundColor: `${c.primary}12`, borderBottomColor: c.border }]}>
          <Text style={{ fontSize: 32 }}>{subject.icon ?? '📚'}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            {subject.gradeLevel && (
              <View style={[styles.gradePill, { backgroundColor: `${c.primary}20` }]}>
                <Text style={[{ color: c.primary, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                  الصف: {subject.gradeLevel}
                </Text>
              </View>
            )}
            {subject.description && (
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}>
                {subject.description}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Teachers list */}
      <FlatList
        data={subject?.teachers ?? []}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={adminToken
              ? () => router.push({ pathname: '/admin/teacher-detail/[id]' as any, params: { id: item.id } })
              : undefined}
            activeOpacity={adminToken ? 0.75 : 1}
            style={[styles.teacherRow, { backgroundColor: c.card, borderColor: c.border }]}
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                <Text style={[{ color: c.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 18 }]}>
                  {item.fullName[0]}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs, textAlign: 'right' }]}>
                {item.fullName}
              </Text>
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}>
                @{item.username}
              </Text>
              {item.bio && (
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]} numberOfLines={1}>
                  {item.bio}
                </Text>
              )}
            </View>
            {!item.isActive && (
              <View style={[styles.inactiveBadge, { backgroundColor: `${c.destructive}20` }]}>
                <Text style={[{ color: c.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>موقوف</Text>
              </View>
            )}
            {adminToken && <Ionicons name="chevron-back" size={16} color={c.mutedForeground} />}
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }]}>
            الأساتذة ({subject?.teachers?.length ?? 0})
          </Text>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={40} color={c.mutedForeground} />
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, textAlign: 'center' }]}>
                لا يوجد أساتذة في هذه المادة بعد
              </Text>
              {adminToken && (
                <TouchableOpacity
                  onPress={() => setShowAddTeacher(true)}
                  style={[styles.addFirstBtn, { backgroundColor: c.primary }]}
                >
                  <Ionicons name="add" size={18} color={c.primaryForeground} />
                  <Text style={[{ color: c.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                    إضافة أستاذ
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Teacher Modal */}
      <Modal visible={showAddTeacher} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setShowAddTeacher(false)}>
              <Text style={[{ color: c.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>إضافة أستاذ</Text>
            <TouchableOpacity onPress={handleAddTeacher} disabled={createTeacher.isPending}>
              <Text style={[{ color: createTeacher.isPending ? c.mutedForeground : c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                {createTeacher.isPending ? '...' : 'حفظ'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
            {[
              { label: 'الاسم الكامل *', key: 'fullName', placeholder: 'اسم الأستاذ' },
              { label: 'اسم الدخول (يوزر) *', key: 'username', placeholder: 'مثال: teacher1' },
              { label: 'كلمة المرور *', key: 'password', placeholder: 'كلمة المرور', secure: true },
              { label: 'رقم الجوال', key: 'phone', placeholder: 'اختياري' },
              { label: 'نبذة تعريفية', key: 'bio', placeholder: 'اختياري', multiline: true },
            ].map((f) => (
              <View key={f.key} style={{ gap: 6 }}>
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>{f.label}</Text>
                <TextInput
                  value={(form as any)[f.key]}
                  onChangeText={(v) => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry={!!f.secure}
                  multiline={!!f.multiline}
                  textAlign="right"
                  style={[styles.input, {
                    color: c.foreground,
                    borderColor: c.border,
                    backgroundColor: c.card,
                    fontFamily: 'Tajawal_400Regular',
                    fontSize: 14 * fs,
                    minHeight: f.multiline ? 80 : 48,
                  }]}
                />
              </View>
            ))}

            {/* Grade levels */}
            <View style={{ gap: 8 }}>
              <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>
                الصفوف الدراسية
              </Text>
              <View style={styles.gradesGrid}>
                {GRADE_LEVELS.map(g => {
                  const selected = selectedGrades.includes(g);
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => toggleGrade(g)}
                      style={[styles.gradePillBtn, {
                        backgroundColor: selected ? c.primary : c.card,
                        borderColor: selected ? c.primary : c.border,
                      }]}
                    >
                      <Text style={[{ color: selected ? c.primaryForeground : c.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Link Existing Teacher Modal */}
      <Modal visible={showLinkTeacher} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => { setShowLinkTeacher(false); setLinkSearch(''); }}>
              <Text style={[{ color: c.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>ربط أستاذ موجود</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search */}
          <View style={[{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.card }]}>
            <Ionicons name="search" size={16} color={c.mutedForeground} />
            <TextInput
              value={linkSearch}
              onChangeText={setLinkSearch}
              placeholder="بحث عن أستاذ..."
              placeholderTextColor={c.mutedForeground}
              textAlign="right"
              style={[{ flex: 1, color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
            />
          </View>

          <FlatList
            data={filteredTeachers}
            keyExtractor={(t) => String(t.id)}
            renderItem={({ item }) => {
              const alreadyLinked = subject?.teachers.some(t => t.id === item.id) ?? false;
              return (
                <TouchableOpacity
                  onPress={() => !alreadyLinked && handleLinkTeacher(item.id)}
                  activeOpacity={alreadyLinked ? 1 : 0.75}
                  style={[{
                    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
                    padding: 14, marginHorizontal: 16, marginBottom: 8,
                    borderRadius: 20, borderWidth: 1,
                    backgroundColor: alreadyLinked ? `${c.primary}10` : c.card,
                    borderColor: alreadyLinked ? c.primary : c.border,
                  }]}
                >
                  <View style={[styles.avatar, { backgroundColor: alreadyLinked ? c.primary : c.muted }]}>
                    <Text style={[{ color: alreadyLinked ? c.primaryForeground : c.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 18 }]}>
                      {item.fullName[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs, textAlign: 'right' }]}>
                      {item.fullName}
                    </Text>
                    <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}>
                      @{item.username}
                    </Text>
                  </View>
                  {alreadyLinked ? (
                    <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: `${c.primary}20` }]}>
                      <Text style={[{ color: c.primary, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>مرتبط ✓</Text>
                    </View>
                  ) : (
                    <Ionicons name="link-outline" size={20} color={c.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
                <Ionicons name="person-outline" size={36} color={c.mutedForeground} />
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                  {linkSearch ? 'لا توجد نتائج' : 'لا يوجد أساتذة بعد'}
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  gradePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-end' },
  teacherRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarImg: { width: 50, height: 50, borderRadius: 25, flexShrink: 0 },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  empty: { alignItems: 'center', gap: 12, marginTop: 60, paddingHorizontal: 32 },
  addFirstBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, marginTop: 4 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top' },
  gradesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  gradePillBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
