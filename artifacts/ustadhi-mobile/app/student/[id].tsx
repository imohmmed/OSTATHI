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
import { ProgressBar } from '@/components/ProgressBar';
import { useGetCourses } from '@workspace/api-client-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const NOTES_KEY = (studentId: number) => `@ustadhi_teacher_notes_${studentId}`;
const PROGRESS_KEY = '@ustadhi_progress';

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

function useStudentDetail(teacherId: number | undefined, studentId: number) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<StudentDetail | null>({
    queryKey: ['teacher-students', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const res = await fetch(`${base}/api/teachers/${teacherId}/students`);
      if (!res.ok) return null;
      const list: StudentDetail[] = await res.json();
      return list.find((s) => s.id === studentId) ?? null;
    },
    enabled: !!teacherId,
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
  const qc = useQueryClient();

  // Get teacher id from auth context via AsyncStorage
  const [teacherId, setTeacherId] = React.useState<number | undefined>(undefined);
  React.useEffect(() => {
    AsyncStorage.getItem('@ustadhi_auth_user').then((raw) => {
      if (raw) {
        const u = JSON.parse(raw);
        if (u.role === 'teacher') setTeacherId(u.id);
      }
    });
  }, []);

  const { data: student, isLoading } = useStudentDetail(teacherId, studentId);
  const { data: allCourses } = useGetCourses(teacherId ? { teacherId } : undefined);

  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  // Load notes from AsyncStorage
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

  const enrolledCourses = (allCourses ?? []).filter((c) =>
    student?.enrolledCourseIds?.includes(c.id)
  );

  const initials = student?.fullName
    ? student.fullName.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('')
    : '؟';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={[{ fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 28 * fs }]}>
            {initials}
          </Text>
        </View>
        {isLoading ? (
          <Text style={[{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal_400Regular' }]}>جاري التحميل...</Text>
        ) : (
          <>
            <Text style={[styles.name, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs }]}>
              {student?.fullName}
            </Text>
            <View style={[styles.gradeBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={[{ fontFamily: 'Tajawal_500Medium', color: '#fff', fontSize: 13 * fs }]}>
                {student?.gradeLevel}
              </Text>
            </View>
            {!student?.isActive && (
              <View style={[styles.inactiveBadge, { backgroundColor: colors.destructive }]}>
                <Text style={[{ fontFamily: 'Tajawal_500Medium', color: '#fff', fontSize: 12 * fs }]}>حساب موقوف</Text>
              </View>
            )}
          </>
        )}
      </LinearGradient>

      {/* Contact info */}
      {student && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
            معلومات التواصل
          </Text>
          {[
            { icon: 'call' as const, label: 'رقم الطالب', value: student.phone },
            { icon: 'person' as const, label: 'ولي الأمر', value: student.parentName },
            { icon: 'call' as const, label: 'رقم ولي الأمر', value: student.parentPhone },
          ].map((row) =>
            row.value ? (
              <View key={row.label} style={styles.infoRow}>
                <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                  {row.value}
                </Text>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
                  {row.label}
                </Text>
                <Ionicons name={row.icon} size={16} color={colors.primary} />
              </View>
            ) : null
          )}
        </View>
      )}

      {/* Enrolled courses */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
          الكورسات المشترك بها ({enrolledCourses.length})
        </Text>
        {enrolledCourses.length === 0 ? (
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
                <Text style={[styles.courseName, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>
                  {course.title}
                </Text>
              </View>
              <Ionicons name="chevron-back" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Teacher notes */}
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
          style={[styles.notesInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
        />
        <TouchableOpacity
          onPress={saveNotes}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="save" size={16} color={colors.primaryForeground} />
          <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>حفظ الملاحظات</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 24, gap: 10, paddingHorizontal: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  name: {},
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  inactiveBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  section: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
  },
  sectionTitle: { textAlign: 'right' },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 4 },
  infoLabel: { flex: 1, textAlign: 'right' },
  infoValue: { textAlign: 'right' },
  courseRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  courseRowLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },
  courseName: { flex: 1, textAlign: 'right' },
  emptyText: { textAlign: 'center', paddingVertical: 8 },
  noteHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  savedBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 120 },
  saveBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
});
