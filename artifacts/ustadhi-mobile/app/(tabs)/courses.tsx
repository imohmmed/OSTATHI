import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  // Image already imported above
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { CourseCard } from '@/components/CourseCard';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { ProgressBar } from '@/components/ProgressBar';
import { useGetStudentCourses, useGetCourses, useGetSubjects } from '@workspace/api-client-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

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

const GRADE_LEVELS = [
  'سادس ابتدائي',
  'اول متوسط', 'ثاني متوسط', 'ثالث متوسط',
  'رابع اعدادي علمي', 'رابع اعدادي ادبي',
  'خامس اعدادي علمي', 'خامس اعدادي ادبي',
  'سادس اعدادي علمي', 'سادس اعدادي ادبي',
];

function useCreateCourseForTeacher() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, title, subjectId, description, thumbnailUrl, gradeLevel }: { teacherId: number; title: string; subjectId: number; description?: string; thumbnailUrl?: string; gradeLevel?: string }) => {
      const res = await fetch(`${base}/api/teachers/${teacherId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subjectId, description, thumbnailUrl, gradeLevel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'فشل إنشاء الكورس');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

// ─────────────────────────────────────────────
// TEACHER COURSE CARD
// ─────────────────────────────────────────────
function TeacherCourseCard({ course, fs, colors, onPress, onDelete }: {
  course: any; fs: number; colors: any;
  onPress: () => void; onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[tcStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* ── Thumbnail ── */}
      <View style={tcStyles.thumbWrap}>
        {course.thumbnailUrl ? (
          <Image source={{ uri: course.thumbnailUrl }} style={tcStyles.thumb} resizeMode="cover" />
        ) : (
          <View style={[tcStyles.thumb, tcStyles.thumbPlaceholder, { backgroundColor: '#101D36' }]}>
            <Ionicons name="book" size={32} color="rgba(212,168,67,0.8)" />
          </View>
        )}
        {/* Subject pill */}
        {course.subjectName && (
          <View style={tcStyles.subjectPill}>
            <Text style={[tcStyles.subjectText, { fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>{course.subjectName}</Text>
          </View>
        )}
        {/* Status badge top-left */}
        <View style={[tcStyles.statusBadge, {
          backgroundColor: course.isPublished ? 'rgba(34,197,94,0.85)' : 'rgba(100,116,139,0.85)',
        }]}>
          <View style={[tcStyles.statusDot, { backgroundColor: course.isPublished ? '#fff' : 'rgba(255,255,255,0.6)' }]} />
          <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 10 * fs }]}>
            {course.isPublished ? 'منشور' : 'مسودة'}
          </Text>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={tcStyles.body}>
        <Text style={[tcStyles.title, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]} numberOfLines={2}>
          {course.title}
        </Text>

        {/* Grade level */}
        {course.gradeLevel && (
          <View style={[tcStyles.gradePill, { backgroundColor: '#D4A843' + '18', borderColor: '#D4A843' + '40' }]}>
            <Ionicons name="school-outline" size={12} color="#D4A843" />
            <Text style={[{ color: '#D4A843', fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>{course.gradeLevel}</Text>
          </View>
        )}

        {/* Stats row */}
        <View style={tcStyles.statsRow}>
          <View style={tcStyles.statItem}>
            <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
              {course.studentsCount ?? 0} طالب
            </Text>
          </View>
          <View style={[tcStyles.dot, { backgroundColor: colors.border }]} />
          <View style={tcStyles.statItem}>
            <Ionicons name="play-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
              {course.lessonsCount ?? 0} محاضرة
            </Text>
          </View>
        </View>

        {/* Action row */}
        <View style={[tcStyles.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[tcStyles.deleteBtn, { borderColor: '#ef444430', backgroundColor: '#ef444408' }]}
          >
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={[{ color: '#ef4444', fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>حذف</Text>
          </TouchableOpacity>
          <View style={tcStyles.statItem}>
            <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>إدارة الكورس</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const tcStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: '100%', aspectRatio: 16 / 9 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  subjectPill: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(16,29,54,0.78)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  subjectText: { color: '#fff' },
  statusBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  body: { padding: 14, gap: 8 },
  title: { textAlign: 'right', lineHeight: 24 },
  gradePill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    alignSelf: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    justifyContent: 'flex-end',
  },
  statItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  dot: { width: 3, height: 3, borderRadius: 2 },
  actionRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 1, marginTop: 2,
  },
  deleteBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
  },
});

// ─────────────────────────────────────────────
// TEACHER COURSES VIEW
// ─────────────────────────────────────────────
function TeacherCourses() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fontScale } = useApp();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSubjectId, setNewSubjectId] = useState<number | null>(null);
  const [newGradeLevel, setNewGradeLevel] = useState<string | null>(null);
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const { data: courses, isLoading, refetch } = useGetCourses({ teacherId: user!.id });
  const { data: subjects } = useGetSubjects();
  const createCourse = useCreateCourseForTeacher();

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const filtered = (courses ?? []).filter((c) => {
    if (filter === 'published') return c.isPublished;
    if (filter === 'draft') return !c.isPublished;
    return true;
  });

  const handleDelete = (courseId: number, courseTitle: string) => {
    Alert.alert(
      'حذف الكورس',
      `هل أنت متأكد من حذف "${courseTitle}"؟\nسيُحذف الكورس وجميع محاضراته نهائياً ولا يمكن التراجع.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const domain = process.env.EXPO_PUBLIC_DOMAIN;
              const base = domain ? `https://${domain}` : '';
              const res = await fetch(`${base}/api/mobile/teacher/courses/${courseId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId: user!.id }),
              });
              if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل الحذف');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              refetch();
            } catch (e: any) {
              Alert.alert('خطأ', e.message);
            }
          },
        },
      ]
    );
  };

  const pickThumbnail = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('الإذن مطلوب', 'يرجى السماح بالوصول إلى الصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.uri.split('/').pop() ?? 'thumbnail.jpg';
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const base = domain ? `https://${domain}` : '';
    setUploadingImg(true);
    try {
      const form = new FormData();
      form.append('file', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' } as any);
      const res = await fetch(`${base}/api/messages/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('فشل رفع الصورة');
      const { url } = await res.json();
      setNewThumbnailUrl(url);
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) { Alert.alert('تنبيه', 'يرجى إدخال عنوان الكورس'); return; }
    if (!newSubjectId) { Alert.alert('تنبيه', 'يرجى اختيار المادة'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const course = await createCourse.mutateAsync({
        teacherId: user!.id,
        title: newTitle.trim(),
        subjectId: newSubjectId,
        description: newDesc.trim() || undefined,
        thumbnailUrl: newThumbnailUrl || undefined,
        gradeLevel: newGradeLevel || undefined,
      });
      setShowCreateModal(false);
      setNewTitle(''); setNewDesc(''); setNewSubjectId(null); setNewThumbnailUrl(null); setNewGradeLevel(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/course/${course.id}`);
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>كورساتي</Text>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={20} color={colors.primaryForeground} />
          <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>إنشاء كورس</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {[
          { key: 'all', label: 'الكل' },
          { key: 'published', label: 'منشور' },
          { key: 'draft', label: 'مسودة' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key as any)}
            style={[styles.filterTab, filter === f.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[{ fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs, color: filter === f.key ? colors.primary : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 12 }}
      >
        {isLoading ? (
          [1, 2, 3].map((i) => <View key={i} style={{ marginHorizontal: 16, marginBottom: 16 }}><SkeletonCard /></View>)
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={52} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, textAlign: 'center' }]}>
              {filter === 'all' ? 'لم تنشئ أي كورسات بعد' : filter === 'published' ? 'لا توجد كورسات منشورة' : 'لا توجد مسودات'}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity onPress={() => setShowCreateModal(true)} style={[styles.createFirstBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={18} color={colors.primaryForeground} />
                <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>أنشئ أول كورس</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((course) => (
            <TeacherCourseCard
              key={course.id}
              course={course}
              fs={fs}
              colors={colors}
              onPress={() => router.push(`/course/${course.id}`)}
              onDelete={() => handleDelete(course.id, course.title)}
            />
          ))
        )}
      </ScrollView>

      {/* Create Course Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs }]}>
              إنشاء كورس جديد
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
            {/* ── Thumbnail picker ── */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>صورة الكورس</Text>
              <TouchableOpacity
                onPress={pickThumbnail}
                disabled={uploadingImg}
                style={[cStyles.imgPicker, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                {newThumbnailUrl ? (
                  <Image source={{ uri: newThumbnailUrl }} style={cStyles.imgPreview} resizeMode="cover" />
                ) : (
                  <View style={cStyles.imgPlaceholder}>
                    <Ionicons name="image-outline" size={32} color={colors.mutedForeground} />
                    <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
                      {uploadingImg ? 'جاري الرفع...' : 'اضغط لاختيار صورة (16:9)'}
                    </Text>
                  </View>
                )}
                {newThumbnailUrl && (
                  <View style={cStyles.imgOverlay}>
                    <Ionicons name="camera-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }}>
                      {uploadingImg ? 'جاري الرفع...' : 'تغيير الصورة'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {newThumbnailUrl && (
                <TouchableOpacity onPress={() => setNewThumbnailUrl(null)} style={{ alignSelf: 'flex-end' }}>
                  <Text style={[{ color: '#ef4444', fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>حذف الصورة</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>عنوان الكورس *</Text>
              <TextInput
                value={newTitle} onChangeText={setNewTitle}
                placeholder="مثال: كورس الفيزياء العامة"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
                style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>المادة الدراسية *</Text>
              <View style={styles.subjectsGrid}>
                {(subjects ?? []).map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => { setNewSubjectId(sub.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.subjectPill, {
                      backgroundColor: newSubjectId === sub.id ? colors.primary : colors.card,
                      borderColor: newSubjectId === sub.id ? colors.primary : colors.border,
                    }]}
                  >
                    {sub.icon && <Text style={{ fontSize: 14 }}>{sub.icon}</Text>}
                    <Text style={[{ fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs, color: newSubjectId === sub.id ? colors.primaryForeground : colors.foreground }]}>
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── الصف الدراسي ── */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>الصف الدراسي</Text>
              <View style={styles.subjectsGrid}>
                {GRADE_LEVELS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => { setNewGradeLevel(newGradeLevel === g ? null : g); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.subjectPill, {
                      backgroundColor: newGradeLevel === g ? colors.primary : colors.card,
                      borderColor: newGradeLevel === g ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[{ fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs, color: newGradeLevel === g ? colors.primaryForeground : colors.foreground }]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>وصف الكورس</Text>
              <TextInput
                value={newDesc} onChangeText={setNewDesc}
                placeholder="وصف مختصر عن هذا الكورس..."
                placeholderTextColor={colors.mutedForeground}
                multiline numberOfLines={3} textAlign="right"
                style={[styles.textAreaInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
              />
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={createCourse.isPending}
              style={[styles.createBtn, { backgroundColor: colors.primary, opacity: createCourse.isPending ? 0.7 : 1 }]}
            >
              <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
                {createCourse.isPending ? 'جاري الإنشاء...' : 'إنشاء الكورس'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// STUDENT COURSES VIEW
// ─────────────────────────────────────────────
function StudentCourses() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn } = useAuth();
  const { fontScale } = useApp();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [refreshing, setRefreshing] = useState(false);

  const studentId = user?.role === 'student' ? user.id : undefined;
  const { data: courses, isLoading, refetch } = useGetStudentCourses(studentId as number, { query: { enabled: !!studentId } });
  const { data: progress } = useLocalProgress();

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
          <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>كورساتي</Text>
        </View>
        <View style={styles.gateContainer}>
          <View style={[styles.gateIcon, { backgroundColor: colors.muted }]}>
            <Ionicons name="lock-closed" size={40} color={colors.primary} />
          </View>
          <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>سجّل دخولك أولاً</Text>
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, textAlign: 'center' }]}>
            يجب تسجيل الدخول لعرض الكورسات المخصصة لك
          </Text>
          <TouchableOpacity onPress={() => router.push('/login')} style={[styles.loginBtn, { backgroundColor: colors.primary }]}>
            <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>تسجيل الدخول</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>كورساتي</Text>
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>مرحباً، {user?.fullName}</Text>
        </View>
        {user?.gradeLevel && (
          <View style={[styles.gradeBadge, { backgroundColor: colors.primary }]}>
            <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>{user.gradeLevel}</Text>
          </View>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 16 }}
      >
        {isLoading ? (
          [1, 2, 3].map((i) => <View key={i} style={{ marginHorizontal: 16, marginBottom: 12 }}><SkeletonCard /></View>)
        ) : !courses?.length ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, textAlign: 'center' }]}>
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
              thumbnailUrl={(course as any).thumbnailUrl ?? null}
              progress={progress?.[course.id] ?? 0}
              onPress={() => router.push(`/course/${course.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// ADMIN: إدارة المواد
// ─────────────────────────────────────────────
function AdminSubjects() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: subjects, isLoading, refetch } = useGetSubjects();

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: c.border }]}>
        <Text style={[styles.screenTitle, { color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          المواد الدراسية
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/admin/new-subject' as any)}
          style={[styles.addBtn, { backgroundColor: c.primary }]}
        >
          <Ionicons name="add" size={18} color={c.primaryForeground} />
          <Text style={[{ color: c.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>مادة جديدة</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={subjects ?? []}
        keyExtractor={(s) => String(s.id)}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 12, gap: 12, justifyContent: 'flex-end' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/subject/[id]' as any, params: { id: item.id, name: encodeURIComponent(item.name) } })}
            style={[subjectStyles.card, { backgroundColor: c.card, borderColor: c.border, flex: 1 }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 36 }}>{item.icon ?? '📚'}</Text>
            <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, textAlign: 'center' }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.gradeLevel ? (
              <View style={[subjectStyles.gradePill, { backgroundColor: `${c.primary}20` }]}>
                <Text style={[{ color: c.primary, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>
                  {item.gradeLevel}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          isLoading ? (
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', padding: 12, gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={[subjectStyles.card, { backgroundColor: c.card, borderColor: c.border, flex: 1 }]} />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="library-outline" size={48} color={c.mutedForeground} />
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                لا توجد مواد بعد
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 + insets.bottom, gap: 12 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const subjectStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    minHeight: 140,
    justifyContent: 'center',
  },
  gradePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
});

// ─────────────────────────────────────────────
// ROOT EXPORT — role-aware
// ─────────────────────────────────────────────
export default function CoursesScreen() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminSubjects />;
  if (user?.role === 'teacher') return <TeacherCourses />;
  return <StudentCourses />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  screenTitle: {},
  addBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  filterRow: { flexDirection: 'row-reverse', borderBottomWidth: 1, paddingHorizontal: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  courseWrapper: { marginBottom: 2 },
  courseFooter: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 26, borderWidth: 1, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  deleteBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  gateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 16 },
  gateIcon: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  loginBtn: { marginTop: 8, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 999 },
  emptyContainer: { alignItems: 'center', gap: 12, marginTop: 60 },
  createFirstBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: {},
  fieldGroup: { gap: 8 },
  fieldLabel: { textAlign: 'right' },
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  textAreaInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 80, textAlignVertical: 'top' },
  subjectsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  subjectPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  createBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
});

const cStyles = StyleSheet.create({
  imgPicker: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imgPreview: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imgOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
});
