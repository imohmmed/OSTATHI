import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const NOTES_KEY = (studentId: number) => `@ustadhi_teacher_notes_${studentId}`;

const API_BASE = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
};

interface StudentDetail {
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

interface CourseItem {
  id: number;
  title: string;
  subjectName?: string | null;
  teacherName?: string | null;
  gradeLevel?: string | null;
  isPublished: boolean;
  thumbnailUrl?: string | null;
}

// جلب بيانات الطالب من قائمة طلاب الأستاذ
function useStudentDetail(teacherId: number | undefined, studentId: number) {
  return useQuery<StudentDetail | null>({
    queryKey: ['teacher-students', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const res = await fetch(`${API_BASE()}/api/teachers/${teacherId}/students`);
      if (!res.ok) return null;
      const list: StudentDetail[] = await res.json();
      return list.find((s) => s.id === studentId) ?? null;
    },
    enabled: !!teacherId,
  });
}

// جلب كورسات الطالب من endpoint مخصص (يشمل التسجيل الصريح + grade level)
function useStudentCourses(studentId: number) {
  return useQuery<CourseItem[]>({
    queryKey: ['student-courses', studentId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE()}/api/students/${studentId}/courses`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!studentId,
  });
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;
  const router = useRouter();
  const { user } = useAuth();

  // تحديد teacherId: الأستاذ يستخدم id الخاص، المساعد يستخدم teacherId الخاص به
  const teacherId =
    user?.role === 'teacher'
      ? user.id
      : user?.role === 'assistant'
      ? (user as any).teacherId
      : undefined;

  const { data: student, isLoading } = useStudentDetail(teacherId, studentId);
  const { data: enrolledCourses = [], isLoading: coursesLoading } = useStudentCourses(studentId);

  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY(studentId)).then((v) => {
      if (v) setNotes(v);
    });
  }, [studentId]);

  const saveNotes = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(NOTES_KEY(studentId), notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const initials = student?.fullName
    ? student.fullName.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('')
    : '؟';

  const contactRows = student
    ? [
        { icon: 'call' as const, label: 'رقم الطالب', value: student.phone },
        { icon: 'person' as const, label: 'ولي الأمر', value: student.parentName },
        { icon: 'call' as const, label: 'رقم ولي الأمر', value: student.parentPhone },
        { icon: 'school' as const, label: 'المرحلة الدراسية', value: student.gradeLevel },
      ].filter((r) => r.value)
    : [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* زر الرجوع */}
      <View style={[styles.backRow, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>رجوع</Text>
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
          تفاصيل الطالب
        </Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Hero */}
      <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={[{ fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 28 * fs }]}>
            {initials}
          </Text>
        </View>
        {isLoading ? (
          <Text style={[{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal_400Regular' }]}>جاري التحميل...</Text>
        ) : student ? (
          <>
            <Text style={[{ fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs, textAlign: 'center' }]}>
              {student.fullName}
            </Text>
            {student.gradeLevel ? (
              <View style={[styles.gradeBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[{ fontFamily: 'Tajawal_500Medium', color: '#fff', fontSize: 13 * fs }]}>
                  {student.gradeLevel}
                </Text>
              </View>
            ) : null}
            {!student.isActive && (
              <View style={[styles.inactiveBadge, { backgroundColor: colors.destructive }]}>
                <Text style={[{ fontFamily: 'Tajawal_500Medium', color: '#fff', fontSize: 12 * fs }]}>حساب موقوف</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={[{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal_400Regular' }]}>لم يتم العثور على الطالب</Text>
        )}
      </LinearGradient>

      {/* معلومات التواصل */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
          معلومات التواصل
        </Text>
        {isLoading ? (
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'center' }]}>
            جاري التحميل...
          </Text>
        ) : contactRows.length === 0 ? (
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'center' }]}>
            لا توجد معلومات تواصل
          </Text>
        ) : (
          contactRows.map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                {row.value}
              </Text>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
                {row.label}
              </Text>
              <Ionicons name={row.icon} size={16} color={colors.primary} />
            </View>
          ))
        )}
      </View>

      {/* الكورسات المشترك بها */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
          الكورسات المشترك بها ({coursesLoading ? '...' : enrolledCourses.length})
        </Text>
        {coursesLoading ? (
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'center' }]}>
            جاري التحميل...
          </Text>
        ) : enrolledCourses.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
            لم يُضف لهذا الطالب أي كورس بعد
          </Text>
        ) : (
          enrolledCourses.map((course) => (
            <TouchableOpacity
              key={course.id}
              onPress={() => router.push(`/course/${course.id}`)}
              style={[styles.courseRow, { borderColor: colors.border }]}
            >
              <View style={styles.courseRowLeft}>
                <Ionicons name="book" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.courseName, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>
                    {course.title}
                  </Text>
                  {course.teacherName ? (
                    <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]}>
                      {course.teacherName}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-back" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* ملاحظاتي */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.noteHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
            ملاحظاتي
          </Text>
          {notesSaved && (
            <View style={[styles.savedBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[{ color: colors.success, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>تم الحفظ</Text>
            </View>
          )}
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="اكتب ملاحظاتك عن هذا الطالب..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={5}
          textAlign="right"
          textAlignVertical="top"
          style={[
            styles.notesInput,
            {
              color: colors.foreground,
              backgroundColor: colors.background,
              borderColor: colors.border,
              fontFamily: 'Tajawal_400Regular',
              fontSize: 14 * fs,
            },
          ]}
        />
        <TouchableOpacity
          onPress={saveNotes}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="save" size={16} color={colors.primaryForeground} />
          <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
            حفظ الملاحظات
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, minWidth: 70 },
  pageTitle: { textAlign: 'center' },
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 24, gap: 10, paddingHorizontal: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  inactiveBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { textAlign: 'right' },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 4 },
  infoLabel: { flex: 1, textAlign: 'right' },
  infoValue: { textAlign: 'right' },
  courseRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  courseRowLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },
  courseName: { flex: 1, textAlign: 'right' },
  emptyText: { textAlign: 'center', paddingVertical: 8 },
  noteHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  savedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 120 },
  saveBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
});
