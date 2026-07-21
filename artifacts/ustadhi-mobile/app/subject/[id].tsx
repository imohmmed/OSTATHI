import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PageHeader } from '@/components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

// ── قراءة صورة كـ base64 ──────────────────────────────────────────────────
async function readImageBase64(uri: string): Promise<{ data: string; mimeType: string }> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(',')[1];
        resolve({ data: b64, mimeType: blob.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const FileSystem = await import('expo-file-system');
  const data = await FileSystem.default.readAsStringAsync(uri, { encoding: 'base64' as any });
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp' };
  return { data, mimeType: mimeMap[ext] ?? 'image/jpeg' };
}

interface Teacher {
  id: number;
  fullName: string;
  username: string;
  phone: string;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  gradeLevels: string[];
  trialLessonUrl: string | null;
}

interface SubjectDetail {
  id: number;
  name: string;
  icon: string | null;
  gradeLevel: string | null;
  description: string | null;
  teachers: Teacher[];
}

function useSubjectDetail(id: number) {
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
    mutationFn: async (body: {
      fullName: string; username: string; password: string;
      phone?: string; bio?: string; trialLessonUrl?: string;
      subjectId: number; gradeLevels: string[];
    }) => {
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
      qc.invalidateQueries({ queryKey: ['subject-detail', vars.subjectId] });
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

// Build grade → teachers map, ordered by GRADE_LEVELS
function groupByGrade(teachers: Teacher[]) {
  const map = new Map<string, Teacher[]>();
  const noGrade: Teacher[] = [];
  teachers.forEach(t => {
    if (!t.gradeLevels?.length) { noGrade.push(t); return; }
    t.gradeLevels.forEach(g => {
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(t);
    });
  });
  // First: grades matching GRADE_LEVELS order
  const ordered = GRADE_LEVELS.filter(g => map.has(g)).map(g => ({ grade: g, teachers: map.get(g)! }));
  // Then: any grade NOT in GRADE_LEVELS (old format, custom names, etc.)
  map.forEach((ts, grade) => {
    if (!GRADE_LEVELS.includes(grade)) ordered.push({ grade, teachers: ts });
  });
  // Finally: no grade assigned
  if (noGrade.length) ordered.push({ grade: '', teachers: noGrade });
  return ordered;
}

export default function SubjectDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const subjectId = parseInt(id, 10);

  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showLinkTeacher, setShowLinkTeacher] = useState(false);
  const [form, setForm] = useState({
    fullName: '', username: '', password: '',
    phone: '', bio: '', trialLessonUrl: '',
  });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [linkSearch, setLinkSearch] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const adminToken = (user as any)?.adminToken;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  const { data: subject, isLoading, refetch } = useSubjectDetail(subjectId);
  const qc = useQueryClient();
  const createTeacher = useCreateTeacher(adminToken);

  // ── تعديل صورة المادة ─────────────────────────────────────────────────────
  const handleEditImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('تنبيه', 'يجب السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingImage(true);
    try {
      const uri = result.assets[0].uri;
      const { data, mimeType } = await readImageBase64(uri);
      // رفع الصورة
      const upRes = await fetch(`${base}/api/upload/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mimeType, filename: 'subject' }),
      });
      if (!upRes.ok) throw new Error('فشل رفع الصورة');
      const { url } = await upRes.json();
      const imageUrl = `${base}${url}`;
      // تحديث المادة
      const patchRes = await fetch(`${base}/api/subjects/${subjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify({ imageUrl }),
      });
      if (!patchRes.ok) throw new Error('فشل تحديث المادة');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
      qc.invalidateQueries({ queryKey: ['getSubjects'] });
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل');
    } finally {
      setUploadingImage(false);
    }
  };

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
      setShowLinkTeacher(false); setLinkSearch(''); refetch();
    } catch (e: any) { Alert.alert('خطأ', e.message); }
  };

  const handleAddTeacher = async () => {
    if (!form.fullName || !form.username || !form.password) {
      Alert.alert('خطأ', 'الاسم واسم الدخول وكلمة المرور مطلوبة'); return;
    }
    try {
      await createTeacher.mutateAsync({
        fullName: form.fullName, username: form.username, password: form.password,
        phone: form.phone || undefined, bio: form.bio || undefined,
        trialLessonUrl: form.trialLessonUrl || undefined,
        subjectId, gradeLevels: selectedGrades,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddTeacher(false);
      setForm({ fullName: '', username: '', password: '', phone: '', bio: '', trialLessonUrl: '' });
      setSelectedGrades([]);
      refetch();
    } catch (e: any) { Alert.alert('خطأ', e.message); }
  };

  const toggleGrade = (g: string) =>
    setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const sections = groupByGrade(subject?.teachers ?? []);

  // ─── Teacher Card ──────────────────────────────────────────────────────────
  const renderTeacherCard = (item: Teacher, fullWidth = false) => {
    const onPress = () => {
      if (adminToken) {
        router.push({ pathname: '/admin/teacher-detail/[id]' as any, params: { id: item.id } });
      } else {
        router.push({ pathname: '/teacher/[id]' as any, params: { id: item.id } });
      }
    };
    return (
      <TouchableOpacity
        key={item.id}
        onPress={onPress}
        activeOpacity={0.88}
        style={[S.teacherCard, { backgroundColor: c.card, borderColor: c.border }, fullWidth && { width: '100%' }]}
      >
        {/* Rectangular image */}
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={S.cardImage} resizeMode="cover" />
        ) : (
          <View style={[S.cardImagePlaceholder, { backgroundColor: `${c.primary}18` }]}>
            <Text style={{ fontSize: 48 }}>👤</Text>
          </View>
        )}

        {/* Info */}
        <View style={S.cardBody}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[S.cardName, { color: c.foreground, fontSize: 16 * fs }]}>
              {item.fullName}
            </Text>
            {!item.isActive && (
              <View style={[S.inactiveBadge, { backgroundColor: '#ef444420' }]}>
                <Text style={[{ color: '#ef4444', fontFamily: 'Tajawal_500Medium', fontSize: 10 * fs }]}>موقوف</Text>
              </View>
            )}
          </View>

          {item.bio ? (
            <Text style={[S.cardBio, { color: c.mutedForeground, fontSize: 13 * fs }]} numberOfLines={2}>
              {item.bio}
            </Text>
          ) : null}

          {/* Trial lesson button */}
          {(item.trialLessonUrl || true) && (
            <TouchableOpacity
              onPress={onPress}
              style={[S.trialBtn, { backgroundColor: c.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle-outline" size={16} color={c.primaryForeground} />
              <Text style={[S.trialBtnText, { color: c.primaryForeground, fontSize: 13 * fs }]}>
                عرض الدورة التجريبية
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[S.container, { backgroundColor: c.background }]}>
      <PageHeader
        title={subject?.name ?? decodeURIComponent(name ?? '') ?? 'المادة'}
        onBack={() => router.back()}
        backgroundColor={c.background}
        tintColor={c.foreground}
        borderColor={c.border}
      />

      {/* Admin action buttons row */}
      {adminToken && (
        <View style={[S.adminBar, { borderBottomColor: c.border, backgroundColor: c.background }]}>
          <TouchableOpacity
            onPress={handleEditImage}
            disabled={uploadingImage}
            style={[S.adminBarBtn, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b50', opacity: uploadingImage ? 0.6 : 1 }]}
          >
            {uploadingImage
              ? <ActivityIndicator size="small" color="#f59e0b" />
              : <Ionicons name="image-outline" size={16} color="#f59e0b" />}
            <Text style={[{ color: '#f59e0b', fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
              {uploadingImage ? 'جارٍ...' : 'تعديل الصورة'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowLinkTeacher(true)}
            style={[S.adminBarBtn, { backgroundColor: `${c.primary}18`, borderColor: `${c.primary}50` }]}
          >
            <Ionicons name="link-outline" size={16} color={c.primary} />
            <Text style={[{ color: c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>ربط أستاذ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAddTeacher(true)}
            style={[S.adminBarBtn, { backgroundColor: c.primary }]}
          >
            <Ionicons name="add" size={16} color={c.primaryForeground} />
            <Text style={[{ color: c.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>إضافة أستاذ</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 8 }}
      >

        {/* Loading state */}
        {isLoading && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
            <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>جاري التحميل...</Text>
          </View>
        )}

        {/* Empty state */}
        {!isLoading && !sections.length && (
          <View style={S.empty}>
            <Ionicons name="person-outline" size={48} color={c.mutedForeground} />
            <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, textAlign: 'center' }]}>
              لا يوجد أساتذة في هذه المادة بعد
            </Text>
            {adminToken && (
              <TouchableOpacity
                onPress={() => setShowAddTeacher(true)}
                style={[S.addFirstBtn, { backgroundColor: c.primary }]}
              >
                <Ionicons name="add" size={18} color={c.primaryForeground} />
                <Text style={[{ color: c.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>إضافة أستاذ</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Grouped sections */}
        {sections.map(section => (
          <View key={section.grade} style={{ marginBottom: 8 }}>
            {/* Section header */}
            {section.grade ? (
              <View style={[S.sectionHeader, { borderColor: `${c.primary}30` }]}>
                <View style={[S.sectionDivider, { backgroundColor: `${c.primary}30` }]} />
                <View style={[S.sectionPill, { backgroundColor: c.primary }]}>
                  <Text style={[{ color: c.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>
                    {section.grade}
                  </Text>
                </View>
                <View style={[S.sectionDivider, { backgroundColor: `${c.primary}30` }]} />
              </View>
            ) : (
              <Text style={[S.noGradeLabel, { color: c.mutedForeground, fontSize: 12 * fs }]}>
                بدون صف محدد
              </Text>
            )}

            {/* Single teacher → full width; multiple → horizontal scroll */}
            {section.teachers.length === 1 ? (
              <View style={{ paddingHorizontal: 16 }}>
                {renderTeacherCard(section.teachers[0], true)}
              </View>
            ) : (
              <FlatList
                horizontal
                inverted
                data={section.teachers}
                keyExtractor={(t) => String(t.id)}
                renderItem={({ item }) => renderTeacherCard(item, false)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── Add Teacher Modal ─────────────────────────────────────── */}
      <Modal visible={showAddTeacher} animationType="slide" presentationStyle="pageSheet">
        <View style={[S.modal, { backgroundColor: c.background }]}>
          <View style={[S.modalHeader, { borderBottomColor: c.border }]}>
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

            {/* Basic fields */}
            {[
              { label: 'الاسم الكامل *', key: 'fullName', placeholder: 'اسم الأستاذ' },
              { label: 'اسم الدخول *', key: 'username', placeholder: 'مثال: teacher1' },
              { label: 'كلمة المرور *', key: 'password', placeholder: '••••••••', secure: true },
              { label: 'رقم الجوال', key: 'phone', placeholder: 'اختياري' },
              { label: 'نبذة / وصف الأستاذ', key: 'bio', placeholder: 'اختياري', multiline: true },
            ].map(f => (
              <View key={f.key} style={{ gap: 6 }}>
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>{f.label}</Text>
                <TextInput
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry={!!(f as any).secure}
                  multiline={!!(f as any).multiline}
                  textAlign="right"
                  style={[S.input, {
                    color: c.foreground, borderColor: c.border, backgroundColor: c.card,
                    fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs,
                    minHeight: (f as any).multiline ? 80 : 48,
                  }]}
                />
              </View>
            ))}

            {/* Trial lesson URL */}
            <View style={[S.trialSection, { backgroundColor: `${c.primary}08`, borderColor: `${c.primary}30` }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="play-circle-outline" size={18} color={c.primary} />
                <Text style={[{ color: c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                  المحاضرة التجريبية
                </Text>
              </View>
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right', marginBottom: 8 }]}>
                أضف رابط الفيديو التجريبي (YouTube، mp4، إلخ)
              </Text>
              <TextInput
                value={form.trialLessonUrl}
                onChangeText={v => setForm(p => ({ ...p, trialLessonUrl: v }))}
                placeholder="https://youtube.com/..."
                placeholderTextColor={c.mutedForeground}
                textAlign="right"
                autoCapitalize="none"
                style={[S.input, {
                  color: c.foreground, borderColor: `${c.primary}40`, backgroundColor: c.card,
                  fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, minHeight: 48,
                }]}
              />
            </View>

            {/* Grade levels */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
                  {selectedGrades.length} مختار
                </Text>
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                  الصفوف الدراسية
                </Text>
              </View>
              <View style={S.gradesGrid}>
                {GRADE_LEVELS.map(g => {
                  const sel = selectedGrades.includes(g);
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => toggleGrade(g)}
                      style={[S.gradePillBtn, {
                        backgroundColor: sel ? c.primary : c.card,
                        borderColor: sel ? c.primary : c.border,
                      }]}
                    >
                      <Text style={[{ color: sel ? c.primaryForeground : c.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
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

      {/* ── Link Existing Teacher Modal ──────────────────────────── */}
      <Modal visible={showLinkTeacher} animationType="slide" presentationStyle="pageSheet">
        <View style={[S.modal, { backgroundColor: c.background }]}>
          <View style={[S.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => { setShowLinkTeacher(false); setLinkSearch(''); }}>
              <Text style={[{ color: c.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>ربط أستاذ موجود</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.card }]}>
            <Ionicons name="search" size={16} color={c.mutedForeground} />
            <TextInput
              value={linkSearch} onChangeText={setLinkSearch}
              placeholder="بحث عن أستاذ..."
              placeholderTextColor={c.mutedForeground} textAlign="right"
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
                  <View style={[S.avatar, { backgroundColor: alreadyLinked ? c.primary : c.muted }]}>
                    <Text style={[{ color: alreadyLinked ? c.primaryForeground : c.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 18 }]}>
                      {item.fullName[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs, textAlign: 'right' }]}>{item.fullName}</Text>
                    <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}>@{item.username}</Text>
                  </View>
                  {alreadyLinked
                    ? <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: `${c.primary}20` }]}><Text style={[{ color: c.primary, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>مرتبط ✓</Text></View>
                    : <Ionicons name="link-outline" size={20} color={c.primary} />
                  }
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

const S = StyleSheet.create({
  container: { flex: 1 },

  adminBar: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  adminBarBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },

  descBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 14,
    gap: 10,
  },
  sectionDivider: { flex: 1, height: 1 },
  sectionPill: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
  },
  noGradeLabel: {
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
    paddingHorizontal: 16,
    marginVertical: 10,
  },

  // Teacher card
  teacherCard: {
    width: 300,
    marginBottom: 14,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', aspectRatio: 16 / 9 },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 14, gap: 8 },
  cardName: { fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  cardBio: { fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 20 },
  trialBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  trialBtnText: { fontFamily: 'Tajawal_700Bold' },

  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  empty: { alignItems: 'center', gap: 12, marginTop: 60, paddingHorizontal: 32 },
  addFirstBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, marginTop: 4 },

  // Modals
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top' },
  trialSection: { borderRadius: 18, borderWidth: 1, padding: 14 },
  gradesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  gradePillBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
