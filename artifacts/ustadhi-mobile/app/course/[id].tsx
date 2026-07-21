import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PageHeader } from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { LessonStepItem } from '@/components/LessonStepItem';
import { SkeletonBox } from '@/components/SkeletonLoader';
import { AddLessonModal } from '@/components/AddLessonModal';
import {
  useGetCourse,
  useDeleteLesson,
  useUpdateLesson,
  useGetSubjects,
  useGetStudentCourses,
  getGetCourseQueryKey,
} from '@workspace/api-client-react';

const GRADE_LEVELS = [
  'سادس ابتدائي',
  'اول متوسط', 'ثاني متوسط', 'ثالث متوسط',
  'رابع اعدادي علمي', 'رابع اعدادي ادبي',
  'خامس اعدادي علمي', 'خامس اعدادي ادبي',
  'سادس اعدادي علمي', 'سادس اعدادي ادبي',
];

type Lesson = {
  id: number;
  title: string;
  type: string;
  order: number;
  duration?: number | null;
  contentUrl?: string | null;
  contentText?: string | null;
  isPublished?: boolean;
};

// ─── Course Detail Screen ─────────────────────
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  // Editable settings state (synced from course on open)
  const [editTitle, setEditTitle] = useState('');
  const [editSubjectId, setEditSubjectId] = useState<number | null>(null);
  const [editGradeLevel, setEditGradeLevel] = useState<string | null>(null);
  const [editPublished, setEditPublished] = useState(false);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string | null>(null);

  const { data: course, isLoading } = useGetCourse(courseId);
  const { data: subjects } = useGetSubjects();
  const deleteLesson = useDeleteLesson();
  const updateLesson = useUpdateLesson();

  // Enrollment check for students
  const isStudent = user?.role === 'student';
  const { data: enrolledCourses } = useGetStudentCourses(user?.id as number, {
    query: { enabled: isStudent },
  });
  const isEnrolled = isStudent
    ? (enrolledCourses ?? []).some((c: any) => c.id === courseId)
    : true; // teachers/admins always "enrolled"

  const lessons: Lesson[] = (course?.lessons ?? []) as Lesson[];
  const isOwner = user?.role === 'teacher' && course?.teacherId === user.id;

  // Sync ordered lessons when data loads / changes
  useEffect(() => {
    setOrderedLessons(lessons);
  }, [course?.lessons]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleDeleteLesson = (lessonId: number, title: string) => {
    Alert.alert('حذف المحاضرة', `هل تريد حذف "${title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          deleteLesson.mutate(
            { id: lessonId },
            {
              onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) }),
              onError: () => Alert.alert('خطأ', 'فشل الحذف'),
            }
          );
        },
      },
    ]);
  };

  const handleDragEnd = useCallback(
    ({ data }: { data: Lesson[] }) => {
      setOrderedLessons(data);
      // Save new order — only update lessons whose order actually changed
      data.forEach((lesson, idx) => {
        const newOrder = idx + 1;
        if (lesson.order !== newOrder) {
          updateLesson.mutate(
            { id: lesson.id, data: { order: newOrder } as any },
            {
              onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) }),
            }
          );
        }
      });
    },
    [courseId, updateLesson, queryClient]
  );

  const handleAddSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
  };

  const openSettings = () => {
    setEditTitle(course?.title ?? '');
    setEditSubjectId((course as any)?.subjectId ?? null);
    setEditGradeLevel((course as any)?.gradeLevel ?? null);
    setEditPublished((course as any)?.isPublished ?? false);
    setEditThumbnailUrl((course as any)?.thumbnailUrl ?? null);
    setSettingsOpen(true);
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
      setEditThumbnailUrl(url);
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!editTitle.trim()) { Alert.alert('تنبيه', 'اسم الدورة مطلوب'); return; }
    if (!editSubjectId) { Alert.alert('تنبيه', 'يرجى اختيار المادة'); return; }
    if (!editGradeLevel) { Alert.alert('تنبيه', 'يرجى اختيار الصف'); return; }
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const base = domain ? `https://${domain}` : '';
    setSaving(true);
    try {
      const res = await fetch(`${base}/api/teacher/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user!.id,
          title: editTitle.trim(),
          subjectId: editSubjectId,
          gradeLevel: editGradeLevel,
          isPublished: editPublished,
          thumbnailUrl: editThumbnailUrl,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل الحفظ');
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setSettingsOpen(false);
      Alert.alert('✓', 'تم حفظ إعدادات الدورة');
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    } finally {
      setSaving(false);
    }
  };

  const QUIZ_TYPES = ['mcq', 'true_false', 'fill_blank', 'qa', 'quiz'];

  // Extract livestreamId from lesson contentText
  const getLivestreamId = (lesson: Lesson): number | null => {
    try {
      const parsed = JSON.parse(lesson.contentText ?? '{}');
      return parsed.livestreamId ?? null;
    } catch { return null; }
  };

  const handleLessonPress = useCallback(
    (lesson: Lesson) => {
      // Livestream: teacher → broadcast, student → watch
      if ((lesson as any).type === 'livestream') {
        const lsId = getLivestreamId(lesson);
        if (!lsId) {
          Alert.alert('خطأ', 'لا يمكن العثور على معرف البث');
          return;
        }
        if (isOwner) {
          router.push({ pathname: '/livestream/broadcast/[id]' as any, params: { id: lsId } });
        } else if (isStudent) {
          router.push({ pathname: '/livestream/watch/[id]' as any, params: { id: lsId } });
        }
        return;
      }

      if (isOwner) {
        // Teacher → edit screen
        router.push({
          pathname: '/lesson/[id]' as any,
          params: { id: lesson.id, courseId },
        });
      } else if (isStudent) {
        if (QUIZ_TYPES.includes((lesson as any).type ?? '')) {
          // Quiz / exam → dedicated quiz page
          router.push({
            pathname: '/lesson/quiz/[id]' as any,
            params: { id: lesson.id, courseId },
          });
        } else {
          // Video, pdf, text, etc. → lesson viewer
          router.push({
            pathname: '/lesson/view/[id]' as any,
            params: { id: lesson.id, courseId },
          });
        }
      }
    },
    [isOwner, isStudent, courseId, router]
  );

  // ── List Header (hero + stats + section title) ───────────────────
  const renderHeader = () => (
    <>
      {/* Hero */}
      <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.heroSection}>
        {isLoading ? (
          <View style={{ gap: 10, width: '100%' }}>
            <SkeletonBox height={24} width="70%" borderRadius={8} />
            <SkeletonBox height={14} width="40%" borderRadius={6} />
            <SkeletonBox height={12} width="55%" borderRadius={6} />
          </View>
        ) : (
          <>
            <View style={[styles.heroMeta, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                {(course as any)?.subjectName && (
                  <View style={styles.badge}>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }}>
                      {(course as any).subjectName}
                    </Text>
                  </View>
                )}
                {(course as any)?.gradeLevel && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(212,168,67,0.35)' }]}>
                    <Text style={{ color: '#D4A843', fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }}>
                      {(course as any).gradeLevel}
                    </Text>
                  </View>
                )}
                {(course as any)?.isPublished === false && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.25)' }]}>
                    <Text style={{ color: '#fca5a5', fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }}>مسودة</Text>
                  </View>
                )}
              </View>
              {isOwner && (
                <TouchableOpacity onPress={openSettings} style={styles.settingsBtn}>
                  <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.heroTitle, { color: '#fff', fontFamily: 'Tajawal_800ExtraBold', fontSize: 22 * fs }]}>
              {course?.title}
            </Text>
            {course?.teacherName && (
              <View style={styles.heroRow}>
                <Ionicons name="person" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={[{ fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.8)', fontSize: 13 * fs }]}>
                  {course.teacherName}
                </Text>
              </View>
            )}
            {course?.description && (
              <Text style={[styles.heroDesc, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.65)', fontSize: 13 * fs }]}>
                {course.description}
              </Text>
            )}
          </>
        )}
      </LinearGradient>

      {/* ── Live stream reminder banner ── */}
      {!isLoading && (() => {
        const now = new Date();
        const liveLesson = orderedLessons.find(l => {
          if ((l as any).type !== 'livestream') return false;
          try {
            const parsed = JSON.parse(l.contentText ?? '{}');
            return parsed.livestreamId;
          } catch { return false; }
        });
        if (!liveLesson) return null;
        // Check for upcoming/live streams from the lesson list (we use a simple approach)
        return null; // Reminder handled by the lesson card badge below
      })()}

      {/* Stats */}
      {!isLoading && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border, borderTopColor: colors.border }]}>
          {[
            { icon: 'play-circle' as const, value: String(orderedLessons.length), label: 'محاضرة' },
            ...(!isStudent ? [{ icon: 'people' as const, value: String((course as any)?.studentsCount ?? 0), label: 'طالب' }] : []),
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Ionicons name={s.icon} size={16} color={colors.primary} />
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>{s.value}</Text>
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Lessons section header */}
      <View style={styles.lessonsSectionHeader}>
        <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
          محتوى الدورة
        </Text>
        {isOwner && (
          <TouchableOpacity
            onPress={() => setAddModalOpen(true)}
            style={[styles.addLessonBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>إضافة محاضرة</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hint for teachers */}
      {isOwner && orderedLessons.length > 1 && (
        <View style={[styles.dragHint, { backgroundColor: colors.muted }]}>
          <Ionicons name="swap-vertical-outline" size={14} color={colors.mutedForeground} />
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
            اضغط مطوّلاً على ≡ لإعادة ترتيب المحاضرات
          </Text>
        </View>
      )}

      {/* Skeletons while loading */}
      {isLoading && (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.skeletonRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <SkeletonBox width={32} height={32} borderRadius={16} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox height={14} width="70%" />
                <SkeletonBox height={10} width="40%" />
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  // ── Empty component (no lessons) ────────────────────────────────
  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="book-outline" size={52} color={colors.mutedForeground} />
        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs, textAlign: 'center' }]}>
          لا توجد محاضرات بعد
        </Text>
        {isOwner && (
          <TouchableOpacity
            onPress={() => setAddModalOpen(true)}
            style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>أضف أول محاضرة</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Lesson row ──────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Lesson>) => {
      const idx = getIndex() ?? 0;
      return (
        <ScaleDecorator activeScale={0.97}>
          <View
            style={[
              styles.lessonRow,
              isActive && { backgroundColor: colors.muted, borderRadius: 12 },
            ]}
          >
            {/* Drag handle — teacher only */}
            {isOwner && (
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={200}
                style={styles.dragHandle}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <Ionicons
                  name="reorder-three-outline"
                  size={22}
                  color={isActive ? colors.primary : colors.mutedForeground}
                />
              </TouchableOpacity>
            )}

            {/* Lesson item */}
            <View style={{ flex: 1 }}>
              <LessonStepItem
                title={item.title}
                type={item.type as any}
                order={idx + 1}
                duration={item.duration}
                isCompleted={false}
                onPress={() => handleLessonPress(item)}
              />
            </View>

            {/* Delete button — teacher only */}
            {isOwner && (
              <TouchableOpacity
                onPress={() => handleDeleteLesson(item.id, item.title)}
                style={styles.deleteLessonBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={17} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </ScaleDecorator>
      );
    },
    [isOwner, colors, handleLessonPress]
  );

  // ── Gate: not logged in ─────────────────────────────────────────
  if (!isLoading && !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <LinearGradient colors={['#101D36', '#1e3a6e']} style={[StyleSheet.absoluteFill, { opacity: 0.06 }]} />
        <View style={[styles.gateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.gateIcon, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.gateTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
            {course?.title ?? 'الدورة'}
          </Text>
          <Text style={[styles.gateBody, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
            سجّل دخولك أولاً لمشاهدة محتوى هذه الدورة
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/login' as any)}
            style={[styles.gateBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>تسجيل الدخول</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.gateCancel}>
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>رجوع</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Gate: student not enrolled ───────────────────────────────────
  if (!isLoading && isStudent && enrolledCourses !== undefined && !isEnrolled) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <View style={[styles.gateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.gateIcon, { backgroundColor: '#f59e0b18' }]}>
            <Ionicons name="school-outline" size={32} color="#f59e0b" />
          </View>
          <Text style={[styles.gateTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
            {course?.title ?? 'الدورة'}
          </Text>
          <Text style={[styles.gateBody, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
            أنت غير مشترك في هذه الدورة.{'\n'}تواصل مع الإدارة أو أستاذك لإضافتك.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/courses' as any)}
            style={[styles.gateBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>كورساتي</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.gateCancel}>
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>رجوع</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={(course as any)?.title ?? 'الدورة'}
        onBack={() => router.back()}
        backgroundColor="#101D36"
        tintColor="#ffffff"
      />
      <DraggableFlatList<Lesson>
        data={orderedLessons}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        // Disable drag for students / no-owner views
        dragItemOverflow={false}
        activationDistance={isOwner ? 0 : 99999}
      />

      {/* FAB */}
      {isOwner && orderedLessons.length > 0 && (
        <TouchableOpacity
          onPress={() => setAddModalOpen(true)}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: 24 + insets.bottom }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add lesson modal */}
      {addModalOpen && (
        <AddLessonModal
          visible={addModalOpen}
          courseId={courseId}
          teacherId={user?.id ?? 0}
          lessonsCount={orderedLessons.length}
          onClose={() => setAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* ── Teacher settings modal ── */}
      <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsOpen(false)}>
        <View style={[styles.modalWrap, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHdr, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSettingsOpen(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalHdrTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs }]}>
              إعدادات الدورة
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }} showsVerticalScrollIndicator={false}>
            {/* ── Course title ── */}
            <View style={{ gap: 8 }}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                اسم الدورة *
              </Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="مثال: دورة الرياضيات للسادس العلمي"
                placeholderTextColor={colors.mutedForeground}
                style={[{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.foreground,
                  fontFamily: 'Tajawal_400Regular',
                  fontSize: 14 * fs,
                  textAlign: 'right',
                }]}
              />
            </View>

            {/* ── Thumbnail ── */}
            <View style={{ gap: 10 }}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>صورة الدورة</Text>
              <TouchableOpacity
                onPress={pickThumbnail}
                disabled={uploadingImg}
                style={[styles.imgPicker, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                {editThumbnailUrl ? (
                  <Image source={{ uri: editThumbnailUrl }} style={styles.imgPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.imgPlaceholder}>
                    <Ionicons name="image-outline" size={32} color={colors.mutedForeground} />
                    <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
                      {uploadingImg ? 'جاري الرفع...' : 'اضغط لاختيار صورة'}
                    </Text>
                  </View>
                )}
                {editThumbnailUrl && (
                  <View style={styles.imgOverlay}>
                    <Ionicons name="camera-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }}>
                      {uploadingImg ? 'جاري الرفع...' : 'تغيير الصورة'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {editThumbnailUrl && (
                <TouchableOpacity onPress={() => setEditThumbnailUrl(null)} style={{ alignSelf: 'flex-end' }}>
                  <Text style={[{ color: '#ef4444', fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>حذف الصورة</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Publish toggle ── */}
            <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>نشر الدورة</Text>
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, marginTop: 2 }]}>
                  {editPublished ? 'الدورة منشورة وتظهر للطلاب' : 'الدورة مسودة — غير مرئية للطلاب'}
                </Text>
              </View>
              <Switch
                value={editPublished}
                onValueChange={setEditPublished}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>

            {/* ── Subject ── */}
            <View style={{ gap: 10 }}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>المادة الدراسية *</Text>
              <View style={styles.pillsGrid}>
                {(subjects ?? []).map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setEditSubjectId(s.id)}
                    style={[styles.selPill, {
                      backgroundColor: editSubjectId === s.id ? colors.primary : colors.card,
                      borderColor: editSubjectId === s.id ? colors.primary : colors.border,
                    }]}
                  >
                    {s.icon ? <Text style={{ fontSize: 13 }}>{s.icon}</Text> : null}
                    <Text style={[{ fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs, color: editSubjectId === s.id ? colors.primaryForeground : colors.foreground }]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Grade level ── */}
            <View style={{ gap: 10 }}>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>الصف الدراسي *</Text>
              <View style={styles.pillsGrid}>
                {GRADE_LEVELS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setEditGradeLevel(g)}
                    style={[styles.selPill, {
                      backgroundColor: editGradeLevel === g ? colors.primary : colors.card,
                      borderColor: editGradeLevel === g ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[{ fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs, color: editGradeLevel === g ? colors.primaryForeground : colors.foreground }]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSaveSettings}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            >
              <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { padding: 20, paddingTop: 20, gap: 10 },
  heroMeta: { flexDirection: 'row-reverse' },
  badge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  heroTitle: { textAlign: 'right', lineHeight: 32 },
  heroRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  heroDesc: { textAlign: 'right', lineHeight: 20, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 2 },
  lessonsSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
  },
  addLessonBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  dragHint: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  lessonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  dragHandle: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  deleteLessonBtn: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  skeletonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
    paddingHorizontal: 32,
  },
  emptyAddBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  modalWrap: { flex: 1 },
  modalHdr: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHdrTitle: {},
  settingsCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  pillsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  selPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
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
  gateCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateTitle: { textAlign: 'center', lineHeight: 30 },
  gateBody: { textAlign: 'center', lineHeight: 22, opacity: 0.8 },
  gateBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 4,
  },
  gateCancel: { paddingVertical: 8 },
});
