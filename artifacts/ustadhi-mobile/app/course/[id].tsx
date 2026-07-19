import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { LessonStepItem } from '@/components/LessonStepItem';
import { SkeletonBox } from '@/components/SkeletonLoader';
import {
  useGetCourse,
  useCreateLesson,
  useDeleteLesson,
  getGetCourseQueryKey,
} from '@workspace/api-client-react';

// ─── Lesson types ─────────────────────────────
const LESSON_TYPES = [
  { value: 'video',      label: 'فيديو',       icon: 'play-circle-outline'   as const },
  { value: 'pdf',        label: 'PDF',          icon: 'document-outline'      as const },
  { value: 'text',       label: 'نص',           icon: 'document-text-outline' as const },
  { value: 'link',       label: 'رابط',         icon: 'link-outline'          as const },
  { value: 'livestream', label: 'بث مباشر',     icon: 'radio-outline'         as const },
  { value: 'assignment', label: 'واجب',         icon: 'create-outline'        as const },
];

function typeLabel(type: string) {
  return LESSON_TYPES.find(t => t.value === type)?.label ?? type;
}

function typeIcon(type: string) {
  return LESSON_TYPES.find(t => t.value === type)?.icon ?? 'book-outline';
}

// ─── Add Lesson Modal ─────────────────────────
interface AddLessonModalProps {
  visible: boolean;
  courseId: number;
  teacherId: number;
  lessonsCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

function AddLessonModal({ visible, courseId, teacherId, lessonsCount, onClose, onSuccess }: AddLessonModalProps) {
  const colors = useColors();
  const { fontScale } = useApp();
  const fs = fontScale;
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('video');
  const [contentUrl, setContentUrl] = useState('');
  const [contentText, setContentText] = useState('');
  const [durationMin, setDurationMin] = useState('');

  const createLesson = useCreateLesson();
  const needsUrl = ['video', 'pdf', 'link', 'livestream'].includes(selectedType);
  const needsText = selectedType === 'text' || selectedType === 'assignment';

  const handleSubmit = () => {
    if (!title.trim()) { Alert.alert('خطأ', 'عنوان المحاضرة مطلوب'); return; }
    if (needsUrl && !contentUrl.trim()) { Alert.alert('خطأ', 'الرابط مطلوب'); return; }

    createLesson.mutate({
      courseId,
      data: {
        title: title.trim(),
        type: selectedType as any,
        contentUrl: needsUrl ? contentUrl.trim() : undefined,
        contentText: needsText ? contentText.trim() : undefined,
        duration: durationMin ? Math.round(parseFloat(durationMin) * 60) : undefined,
        order: lessonsCount + 1,
        isPublished: true,
        // pass teacherId for ownership check
        ...(teacherId ? { teacherId } : {}),
      } as any,
    }, {
      onSuccess: () => {
        setTitle(''); setContentUrl(''); setContentText(''); setDurationMin('');
        setSelectedType('video');
        onSuccess();
        onClose();
      },
      onError: () => Alert.alert('خطأ', 'فشل إضافة المحاضرة، حاول مرة أخرى'),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
              إضافة محاضرة جديدة
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={createLesson.isPending}
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: createLesson.isPending ? 0.6 : 1 }]}
            >
              <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                {createLesson.isPending ? '...' : 'إضافة'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 + insets.bottom }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                عنوان المحاضرة *
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
                placeholder="مثال: مقدمة التكامل"
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
                textAlign="right"
              />
            </View>

            {/* Type selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                نوع المحاضرة
              </Text>
              <View style={styles.typeGrid}>
                {LESSON_TYPES.map(t => {
                  const isSelected = selectedType === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setSelectedType(t.value)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons name={t.icon} size={18} color={isSelected ? '#fff' : colors.mutedForeground} />
                      <Text style={[{ color: isSelected ? '#fff' : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Content URL */}
            {needsUrl && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                  {selectedType === 'video' ? 'رابط الفيديو (YouTube أو مباشر)' :
                   selectedType === 'pdf' ? 'رابط ملف PDF' :
                   selectedType === 'livestream' ? 'رابط البث المباشر' : 'الرابط'} *
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                  placeholder="https://..."
                  placeholderTextColor={colors.mutedForeground}
                  value={contentUrl}
                  onChangeText={setContentUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  textAlign="left"
                />
              </View>
            )}

            {/* Content Text */}
            {needsText && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                  {selectedType === 'assignment' ? 'تعليمات الواجب' : 'محتوى الدرس النصي'}
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                  placeholder="اكتب المحتوى هنا..."
                  placeholderTextColor={colors.mutedForeground}
                  value={contentText}
                  onChangeText={setContentText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  textAlign="right"
                />
              </View>
            )}

            {/* Duration (video/livestream only) */}
            {(selectedType === 'video' || selectedType === 'livestream') && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                  مدة الفيديو (بالدقائق)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, width: 120 }]}
                  placeholder="45"
                  placeholderTextColor={colors.mutedForeground}
                  value={durationMin}
                  onChangeText={setDurationMin}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Course Detail Screen ─────────────────────
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const queryClient = useQueryClient();

  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: course, isLoading } = useGetCourse(courseId);
  const deleteLesson = useDeleteLesson();

  const lessons = course?.lessons ?? [];
  const isOwner = user?.role === 'teacher' && course?.teacherId === user.id;

  const handleDeleteLesson = (lessonId: number, title: string) => {
    Alert.alert(
      'حذف المحاضرة',
      `هل تريد حذف "${title}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            deleteLesson.mutate({ id: lessonId }, {
              onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) }),
              onError: () => Alert.alert('خطأ', 'فشل الحذف'),
            });
          },
        },
      ]
    );
  };

  const handleAddSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — no extra paddingTop since header is already dark */}
        <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.heroSection}>
          {isLoading ? (
            <View style={{ gap: 10, width: '100%' }}>
              <SkeletonBox height={20} width="70%" borderRadius={8} />
              <SkeletonBox height={14} width="50%" borderRadius={8} />
              <SkeletonBox height={14} width="40%" borderRadius={8} />
            </View>
          ) : (
            <>
              <View style={styles.heroMeta}>
                {course?.subjectName && (
                  <View style={styles.badge}>
                    <Text style={[{ fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs, color: '#fff' }]}>
                      {course.subjectName}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.heroTitle, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs }]}>
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

        {/* Stats */}
        {!isLoading && (
          <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border, borderTopColor: colors.border }]}>
            {[
              { icon: 'play-circle' as const, value: String(lessons.length), label: 'محاضرة' },
              { icon: 'people' as const, value: String((course as any)?.studentsCount ?? 0), label: 'طالب' },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Ionicons name={s.icon} size={16} color={colors.primary} />
                <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>{s.value}</Text>
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Lessons section */}
        <View style={styles.lessonsSection}>
          <View style={styles.lessonsSectionHeader}>
            <Text style={[styles.lessonsTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
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

          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.skeletonRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <SkeletonBox width={32} height={32} borderRadius={16} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBox height={14} width="70%" />
                  <SkeletonBox height={10} width="40%" />
                </View>
              </View>
            ))
          ) : lessons.length === 0 ? (
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
          ) : (
            lessons.map((lesson, idx) => (
              <View key={lesson.id} style={styles.lessonRow}>
                <View style={{ flex: 1 }}>
                  <LessonStepItem
                    title={lesson.title}
                    type={lesson.type as any}
                    order={idx + 1}
                    duration={lesson.duration}
                    isCompleted={false}
                    onPress={() => {}}
                  />
                </View>
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => handleDeleteLesson(lesson.id, lesson.title)}
                    style={styles.deleteLessonBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button for teachers */}
      {isOwner && lessons.length > 0 && (
        <TouchableOpacity
          onPress={() => setAddModalOpen(true)}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: 24 + insets.bottom }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Lesson Modal */}
      {addModalOpen && (
        <AddLessonModal
          visible={addModalOpen}
          courseId={courseId}
          teacherId={user?.id ?? 0}
          lessonsCount={lessons.length}
          onClose={() => setAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}
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
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { alignItems: 'center', gap: 2 },
  lessonsSection: { paddingTop: 20 },
  lessonsSectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 },
  lessonsTitle: {},
  addLessonBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  lessonRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  deleteLessonBtn: { paddingHorizontal: 12, paddingVertical: 14 },
  skeletonRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
  emptyContainer: { alignItems: 'center', gap: 12, marginTop: 40, paddingHorizontal: 32 },
  emptyAddBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  fab: { position: 'absolute', left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: {},
  modalCloseBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  modalSaveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  fieldGroup: { gap: 8 },
  fieldLabel: {},
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 120, fontSize: 14 },
  typeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
});
