import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { PageHeader } from '@/components/PageHeader';

const NOTES_KEY = (id: number) => `@ustadhi_teacher_notes_${id}`;
const API = () => {
  const d = process.env.EXPO_PUBLIC_DOMAIN;
  return d ? `https://${d}` : '';
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudentDetail {
  id: number; fullName: string; phone: string; gradeLevel: string;
  parentName?: string | null; parentPhone?: string | null;
  isActive: boolean; enrolledCourseIds: number[];
}
interface LessonProgress {
  lessonId: number; lessonTitle: string; lessonType: string;
  lessonDuration: number | null; lessonOrder: number;
  courseId: number; courseTitle: string; teacherName: string;
  positionSeconds: number; completed: boolean; updatedAt: string;
}
interface CourseActivity {
  courseId: number; courseTitle: string; teacherName: string;
  lessonsOpened: number; lessonsCompleted: number;
  totalLessons: number;
  lastAccessAt: string | null;
  lessonsByType: Record<string, number>;
  openedByType: Record<string, number>;
  completedByType: Record<string, number>;
  lessons: LessonProgress[];
}
interface ActivitySummary {
  student: { lastSeenAt: string | null; createdAt: string };
  stats: { totalOpened: number; totalCompleted: number; lastActivity: string | null };
  courseActivity: CourseActivity[];
  recentActivity: LessonProgress[];
}
interface CourseItem {
  id: number; title: string; subjectName?: string | null;
  teacherName?: string | null; gradeLevel?: string | null; isPublished: boolean;
}

// ─── API hooks ────────────────────────────────────────────────────────────────
function useStudentDetail(teacherId?: number, studentId?: number) {
  return useQuery<StudentDetail | null>({
    queryKey: ['teacher-students', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const res = await fetch(`${API()}/api/teachers/${teacherId}/students`);
      if (!res.ok) return null;
      const list: StudentDetail[] = await res.json();
      return list.find((s) => s.id === studentId) ?? null;
    },
    enabled: !!teacherId && !!studentId,
  });
}
function useStudentCourses(studentId: number) {
  return useQuery<CourseItem[]>({
    queryKey: ['student-courses', studentId],
    queryFn: async () => {
      const res = await fetch(`${API()}/api/students/${studentId}/courses`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}
function useActivitySummary(studentId: number) {
  return useQuery<ActivitySummary>({
    queryKey: ['student-activity', studentId],
    queryFn: async () => {
      const res = await fetch(`${API()}/api/students/${studentId}/activity-summary`);
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    refetchOnWindowFocus: false,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'للتو';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return new Date(iso).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtSec(s: number) {
  if (s < 60) return `${Math.round(s)}ث`;
  if (s < 3600) return `${Math.floor(s / 60)}د`;
  return `${Math.floor(s / 3600)}س ${Math.floor((s % 3600) / 60)}د`;
}
const TYPE_LABEL: Record<string, string> = {
  video: 'فيديو', pdf: 'PDF', quiz: 'اختبار',
  assignment: 'واجب', link: 'رابط', livestream: 'بث مباشر', feedback: 'تقييم',
};
const TYPE_ICON: Record<string, any> = {
  video: 'videocam', pdf: 'document-text', quiz: 'help-circle',
  assignment: 'create', link: 'link', livestream: 'radio', feedback: 'chatbubble',
};
const TYPE_COLOR: Record<string, string> = {
  video: '#3b82f6', pdf: '#ef4444', quiz: '#8b5cf6',
  assignment: '#f59e0b', link: '#06b6d4', livestream: '#ec4899', feedback: '#22c55e',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, fs }: { label: string; value: string | number; icon: any; color: string; fs: number }) {
  return (
    <View style={[sty.statCard, { backgroundColor: color + '15', borderColor: color + '35' }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ fontFamily: 'Tajawal_700Bold', color, fontSize: 20 * fs, lineHeight: 26 }}>{value}</Text>
      <Text style={{ fontFamily: 'Tajawal_400Regular', color: color + 'bb', fontSize: 11 * fs, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function TypeStatRow({ type, total, opened, completed, fs, color }: {
  type: string; total: number; opened: number; completed: number; fs: number; color: string;
}) {
  if (total === 0 && opened === 0) return null;
  const pct = total > 0 ? opened / total : opened > 0 ? 1 : 0;
  return (
    <View style={sty.typeRow}>
      <View style={[sty.typeIcon, { backgroundColor: TYPE_COLOR[type] + '20' }]}>
        <Ionicons name={TYPE_ICON[type] ?? 'book'} size={13} color={TYPE_COLOR[type] ?? color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontFamily: 'Tajawal_500Medium', color, fontSize: 12 * fs }}>
            {TYPE_LABEL[type] ?? type}
          </Text>
          <Text style={{ fontFamily: 'Tajawal_400Regular', color: '#94a3b8', fontSize: 11 * fs }}>
            {completed > 0 ? `✓ ${completed} مكتمل` : ''}{completed > 0 && opened > completed ? ' · ' : ''}{opened > completed ? `${opened - completed} قيد التقدم` : ''}
            {opened === 0 ? 'لم يُفتح بعد' : ''}
            {total > 0 ? ` / ${total}` : ''}
          </Text>
        </View>
        <View style={sty.pillTrack}>
          <View style={[sty.pillFill, {
            width: `${Math.round(pct * 100)}%` as any,
            backgroundColor: completed === total && total > 0 ? '#22c55e' : TYPE_COLOR[type] ?? color,
          }]} />
        </View>
      </View>
    </View>
  );
}

function LessonRow({ les, colors, fs }: { les: LessonProgress; colors: any; fs: number }) {
  const col = TYPE_COLOR[les.lessonType] ?? colors.primary;
  const ratio = les.lessonType === 'video' && les.lessonDuration && les.lessonDuration > 0
    ? Math.min(les.positionSeconds / les.lessonDuration, 1)
    : les.completed ? 1 : 0;

  return (
    <View style={[sty.lesRow, { borderBottomColor: colors.border }]}>
      {/* status dot */}
      <View style={[sty.lesStatusDot, {
        backgroundColor: les.completed ? '#22c55e' : les.positionSeconds > 0 ? '#f59e0b' : '#cbd5e1',
      }]} />

      <View style={{ flex: 1 }}>
        {/* title + type */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <View style={[sty.typePill, { backgroundColor: col + '20' }]}>
            <Ionicons name={TYPE_ICON[les.lessonType] ?? 'book'} size={10} color={col} />
            <Text style={{ fontFamily: 'Tajawal_400Regular', color: col, fontSize: 10 * fs }}>
              {TYPE_LABEL[les.lessonType] ?? les.lessonType}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Tajawal_500Medium', color: colors.foreground, fontSize: 13 * fs, flex: 1, textAlign: 'right' }}>
            {les.lessonTitle}
          </Text>
        </View>

        {/* video progress bar */}
        {les.lessonType === 'video' && (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 3 }}>
            {les.lessonDuration ? (
              <Text style={{ fontFamily: 'Tajawal_400Regular', color: '#94a3b8', fontSize: 10 * fs }}>
                {fmtSec(les.positionSeconds)} / {fmtSec(les.lessonDuration)}
              </Text>
            ) : null}
            <View style={[sty.pillTrack, { flex: 1 }]}>
              <View style={[sty.pillFill, {
                width: `${Math.round(ratio * 100)}%` as any,
                backgroundColor: les.completed ? '#22c55e' : '#3b82f6',
              }]} />
            </View>
            <Text style={{ fontFamily: 'Tajawal_400Regular', color: '#94a3b8', fontSize: 10 * fs }}>
              {Math.round(ratio * 100)}%
            </Text>
          </View>
        )}

        {/* last access */}
        <Text style={{ fontFamily: 'Tajawal_400Regular', color: '#94a3b8', fontSize: 10 * fs, textAlign: 'right', marginTop: 2 }}>
          {les.completed ? '✓ مكتمل · ' : ''}{relativeTime(les.updatedAt)}
        </Text>
      </View>
    </View>
  );
}

function CourseCard({ course, activity, colors, fs, router }: {
  course: CourseItem;
  activity: CourseActivity | undefined;
  colors: any; fs: number; router: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasActivity = !!activity && activity.lessonsOpened > 0;
  const completionPct = activity && activity.totalLessons > 0
    ? Math.round((activity.lessonsCompleted / activity.totalLessons) * 100) : 0;

  // All lesson types in this course
  const allTypes = activity ? [...new Set([
    ...Object.keys(activity.lessonsByType),
    ...Object.keys(activity.openedByType),
  ])] : [];

  return (
    <View style={[sty.courseCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {/* header row */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={sty.courseCardHeader}
        activeOpacity={0.7}
      >
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />

        <View style={{ flex: 1 }}>
          {/* title */}
          <Text style={{ fontFamily: 'Tajawal_700Bold', color: colors.foreground, fontSize: 14 * fs, textAlign: 'right' }}>
            {course.title}
          </Text>

          {/* teacher + last access */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {course.teacherName ? (
              <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs }}>
                {course.teacherName}
              </Text>
            ) : null}
            {activity?.lastAccessAt ? (
              <Text style={{ fontFamily: 'Tajawal_400Regular', color: '#D4A843', fontSize: 11 * fs }}>
                · {relativeTime(activity.lastAccessAt)}
              </Text>
            ) : (
              <Text style={{ fontFamily: 'Tajawal_400Regular', color: '#94a3b8', fontSize: 11 * fs }}>
                لم يدخل بعد
              </Text>
            )}
          </View>

          {/* progress bar */}
          {hasActivity ? (
            <View style={{ marginTop: 6 }}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs }}>
                  {activity.lessonsOpened} محاضرة فُتحت · {activity.lessonsCompleted} مكتملة
                </Text>
                <Text style={{ fontFamily: 'Tajawal_700Bold', color: completionPct === 100 ? '#22c55e' : '#D4A843', fontSize: 12 * fs }}>
                  {completionPct}%
                </Text>
              </View>
              <View style={sty.pillTrack}>
                <View style={[sty.pillFill, {
                  width: `${completionPct}%` as any,
                  backgroundColor: completionPct === 100 ? '#22c55e' : '#D4A843',
                }]} />
              </View>
            </View>
          ) : null}
        </View>

        <View style={[sty.courseAvatarIcon, { backgroundColor: '#D4A84320' }]}>
          <Ionicons name="book" size={16} color="#D4A843" />
        </View>
      </TouchableOpacity>

      {/* expanded content */}
      {expanded && (
        <View style={[sty.expandBody, { borderTopColor: colors.border }]}>

          {/* type breakdown */}
          {allTypes.length > 0 ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Tajawal_700Bold', color: colors.foreground, fontSize: 13 * fs, textAlign: 'right', marginBottom: 8 }}>
                ملخص النشاط
              </Text>
              {allTypes.map(type => (
                <TypeStatRow
                  key={type}
                  type={type}
                  total={activity?.lessonsByType?.[type] ?? 0}
                  opened={activity?.openedByType?.[type] ?? 0}
                  completed={activity?.completedByType?.[type] ?? 0}
                  fs={fs}
                  color={colors.foreground}
                />
              ))}
            </View>
          ) : null}

          {/* per-lesson list */}
          {activity && activity.lessons.length > 0 ? (
            <View>
              <Text style={{ fontFamily: 'Tajawal_700Bold', color: colors.foreground, fontSize: 13 * fs, textAlign: 'right', marginBottom: 6 }}>
                المحاضرات التي فتحها
              </Text>
              {[...activity.lessons]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((les) => (
                  <LessonRow key={les.lessonId} les={les} colors={colors} fs={fs} />
                ))}
            </View>
          ) : (
            <View style={sty.emptyBox}>
              <Ionicons name="eye-off-outline" size={28} color={colors.mutedForeground} />
              <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 13 * fs, textAlign: 'center' }}>
                لم يفتح أي محاضرة في هذا الكورس بعد
              </Text>
            </View>
          )}

          {/* open course button */}
          <TouchableOpacity
            onPress={() => router.push(`/course/${course.id}`)}
            style={[sty.openCourseBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="open-outline" size={14} color={colors.primary} />
            <Text style={{ fontFamily: 'Tajawal_500Medium', color: colors.primary, fontSize: 13 * fs }}>
              فتح الكورس
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;
  const router = useRouter();
  const { user } = useAuth();

  const teacherId =
    user?.role === 'teacher' ? user.id
    : user?.role === 'assistant' ? (user as any).teacherId
    : undefined;

  const { data: student, isLoading } = useStudentDetail(teacherId, studentId);
  const { data: enrolledCourses = [] } = useStudentCourses(studentId);
  const { data: activity, isLoading: actLoading } = useActivitySummary(studentId);

  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY(studentId)).then((v) => { if (v) setNotes(v); });
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

  const contactRows = student ? [
    { icon: 'call' as const, label: 'رقم الطالب', value: student.phone },
    { icon: 'person' as const, label: 'ولي الأمر', value: student.parentName },
    { icon: 'call' as const, label: 'رقم ولي الأمر', value: student.parentPhone },
    { icon: 'school' as const, label: 'المرحلة الدراسية', value: student.gradeLevel },
  ].filter(r => r.value) : [];

  return (
    <ScrollView
      style={[sty.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        title="ملف الطالب"
        onBack={() => router.back()}
        backgroundColor={colors.background}
        tintColor={colors.foreground}
        borderColor={colors.border}
      />

      {/* ── Hero ── */}
      <LinearGradient colors={['#101D36', '#1a2f5c']} style={sty.hero}>
        <View style={sty.avatarRing}>
          <Text style={{ fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 30 * fs }}>{initials}</Text>
        </View>
        {isLoading ? <ActivityIndicator color="#ffffff80" /> : student ? (
          <>
            <Text style={{ fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs, textAlign: 'center', marginTop: 8 }}>
              {student.fullName}
            </Text>
            <View style={sty.heroBadges}>
              {student.gradeLevel ? (
                <View style={sty.heroBadge}>
                  <Text style={{ fontFamily: 'Tajawal_500Medium', color: '#fff', fontSize: 12 * fs }}>{student.gradeLevel}</Text>
                </View>
              ) : null}
              <View style={[sty.heroBadge, {
                backgroundColor: student.isActive ? '#22c55e25' : '#ef444425',
                borderColor: student.isActive ? '#22c55e50' : '#ef444450',
              }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: student.isActive ? '#22c55e' : '#ef4444' }} />
                <Text style={{ fontFamily: 'Tajawal_500Medium', color: student.isActive ? '#86efac' : '#fca5a5', fontSize: 12 * fs }}>
                  {student.isActive ? 'نشط' : 'موقوف'}
                </Text>
              </View>
            </View>
            {/* last seen */}
            {activity?.student?.lastSeenAt ? (
              <View style={sty.lastSeenChip}>
                <Ionicons name="time-outline" size={12} color="#D4A843" />
                <Text style={{ fontFamily: 'Tajawal_400Regular', color: '#D4A843', fontSize: 12 * fs }}>
                  آخر دخول: {relativeTime(activity.student.lastSeenAt)}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={{ color: '#ffffff60', fontFamily: 'Tajawal_400Regular' }}>لم يُعثر على الطالب</Text>
        )}
      </LinearGradient>

      {/* ── Stats ── */}
      <View style={sty.statsRow}>
        {actLoading ? (
          <ActivityIndicator color={colors.primary} style={{ flex: 1, marginVertical: 8 }} />
        ) : activity ? (
          <>
            <StatCard label="محاضرة فُتحت" value={activity.stats.totalOpened} icon="play-circle" color="#3b82f6" fs={fs} />
            <StatCard label="مكتملة" value={activity.stats.totalCompleted} icon="checkmark-circle" color="#22c55e" fs={fs} />
            <StatCard label="كورسات" value={enrolledCourses.length} icon="book" color="#D4A843" fs={fs} />
          </>
        ) : null}
      </View>

      {/* ── Contact ── */}
      <View style={[sty.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[sty.cardTitle, { color: colors.foreground, fontSize: 15 * fs }]}>معلومات التواصل</Text>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : contactRows.length === 0 ? (
          <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 13 * fs, textAlign: 'center' }}>لا توجد بيانات تواصل</Text>
        ) : (
          contactRows.map((row) => (
            <View key={row.label} style={[sty.contactRow, { borderBottomColor: colors.border }]}>
              <View style={[sty.contactIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={row.icon} size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.foreground, fontSize: 14 * fs, textAlign: 'right' }}>{row.value}</Text>
                <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs, textAlign: 'right' }}>{row.label}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Courses (each separate card) ── */}
      <View style={{ marginHorizontal: 16, marginTop: 14 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontFamily: 'Tajawal_700Bold', color: colors.foreground, fontSize: 16 * fs }}>
            الكورسات المشترك بها
          </Text>
          {enrolledCourses.length > 0 && (
            <View style={[sty.countBadge, { backgroundColor: '#D4A84320' }]}>
              <Text style={{ fontFamily: 'Tajawal_700Bold', color: '#D4A843', fontSize: 12 * fs }}>{enrolledCourses.length}</Text>
            </View>
          )}
        </View>

        {actLoading && enrolledCourses.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : enrolledCourses.length === 0 ? (
          <View style={[sty.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="book-outline" size={32} color={colors.mutedForeground} />
            <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 13 * fs, textAlign: 'center' }}>
              لا توجد كورسات مشتركة
            </Text>
          </View>
        ) : (
          enrolledCourses.map((course) => {
            const ca = activity?.courseActivity?.find(c => c.courseId === course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                activity={ca}
                colors={colors}
                fs={fs}
                router={router}
              />
            );
          })
        )}
      </View>

      {/* ── Notes ── */}
      <View style={[sty.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[sty.cardTitle, { color: colors.foreground, fontSize: 15 * fs }]}>ملاحظاتي</Text>
          {notesSaved && (
            <View style={[sty.savedPill, { backgroundColor: '#22c55e15' }]}>
              <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }}>تم الحفظ</Text>
            </View>
          )}
        </View>
        <TextInput
          value={notes} onChangeText={setNotes}
          placeholder="اكتب ملاحظاتك عن هذا الطالب..."
          placeholderTextColor={colors.mutedForeground}
          multiline numberOfLines={4}
          textAlign="right" textAlignVertical="top"
          style={[sty.notesInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
        />
        <TouchableOpacity onPress={saveNotes} style={[sty.saveBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="save-outline" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }}>حفظ الملاحظات</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sty = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },

  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 22, paddingHorizontal: 24, gap: 4 },
  avatarRing: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: 'rgba(212,168,67,0.18)', borderWidth: 2, borderColor: '#D4A84350',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBadges: { flexDirection: 'row-reverse', gap: 8, marginTop: 6 },
  heroBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  lastSeenChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 8,
    backgroundColor: 'rgba(212,168,67,0.12)', borderWidth: 1, borderColor: 'rgba(212,168,67,0.25)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },

  statsRow: { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  statCard: {
    flex: 1, alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingVertical: 12, gap: 3,
  },

  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontFamily: 'Tajawal_700Bold', textAlign: 'right' },

  contactRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  // Course cards
  courseCard: { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  courseCardHeader: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, padding: 14,
  },
  courseAvatarIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expandBody: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },

  // Type stats
  typeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Lesson rows
  lesRow: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lesStatusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  typePill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 3,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6,
  },

  // Progress bars
  pillTrack: { height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  pillFill: { height: '100%', borderRadius: 3 },

  openCourseBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1, marginTop: 8,
  },

  emptyBox: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyCard: {
    borderRadius: 16, borderWidth: 1, padding: 28,
    alignItems: 'center', gap: 10,
  },

  // Notes
  savedPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 100 },
  saveBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12, gap: 6,
  },
});
