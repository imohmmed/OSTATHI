import React, { useState } from 'react';
import {
  Platform,
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
  lessonDuration: number | null; courseId: number; courseTitle: string;
  teacherName: string; positionSeconds: number; completed: boolean;
  updatedAt: string;
}
interface CourseActivity {
  courseId: number; courseTitle: string; teacherName: string;
  lessonsOpened: number; lessonsCompleted: number;
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
  teacherName?: string | null; gradeLevel?: string | null;
  isPublished: boolean;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useStudentDetail(teacherId: number | undefined, studentId: number) {
  return useQuery<StudentDetail | null>({
    queryKey: ['teacher-students', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const res = await fetch(`${API()}/api/teachers/${teacherId}/students`);
      if (!res.ok) return null;
      const list: StudentDetail[] = await res.json();
      return list.find((s) => s.id === studentId) ?? null;
    },
    enabled: !!teacherId,
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
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'للتو';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDuration(sec: number) {
  if (sec < 60) return `${Math.round(sec)}ث`;
  if (sec < 3600) return `${Math.floor(sec / 60)}د`;
  return `${Math.floor(sec / 3600)}س ${Math.floor((sec % 3600) / 60)}د`;
}
function lessonTypeIcon(type: string): any {
  const map: Record<string, any> = {
    video: 'videocam', pdf: 'document-text', quiz: 'help-circle',
    assignment: 'create', link: 'link', livestream: 'radio', feedback: 'chatbubble',
  };
  return map[type] ?? 'book';
}
function lessonTypeLabel(type: string) {
  const map: Record<string, string> = {
    video: 'فيديو', pdf: 'PDF', quiz: 'اختبار',
    assignment: 'واجب', link: 'رابط', livestream: 'بث مباشر', feedback: 'تقييم',
  };
  return map[type] ?? type;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, fs }: any) {
  return (
    <View style={[sty.statCard, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[sty.statVal, { color, fontFamily: 'Tajawal_700Bold', fontSize: 22 * fs }]}>{value}</Text>
      <Text style={[sty.statLabel, { color: color + 'bb', fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, count, fs, color }: any) {
  return (
    <View style={sty.secHeader}>
      <Text style={[sty.secTitle, { color, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>{title}</Text>
      {count !== undefined && (
        <View style={[sty.countBadge, { backgroundColor: '#D4A84320' }]}>
          <Text style={[{ color: '#D4A843', fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function ProgressPill({ ratio, completed, fs }: { ratio: number; completed: boolean; fs: number }) {
  const pct = Math.min(Math.max(ratio, 0), 1);
  return (
    <View style={sty.pillTrack}>
      <View style={[sty.pillFill, { width: `${pct * 100}%` as any, backgroundColor: completed ? '#22c55e' : '#D4A843' }]} />
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);

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

  const contactRows = student
    ? [
        { icon: 'call' as const, label: 'رقم الطالب', value: student.phone },
        { icon: 'person' as const, label: 'ولي الأمر', value: student.parentName },
        { icon: 'call' as const, label: 'رقم ولي الأمر', value: student.parentPhone },
        { icon: 'school' as const, label: 'المرحلة الدراسية', value: student.gradeLevel },
      ].filter((r) => r.value)
    : [];

  const recentToShow = showAllRecent
    ? (activity?.recentActivity ?? [])
    : (activity?.recentActivity ?? []).slice(0, 5);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 12);

  return (
    <ScrollView
      style={[sty.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[sty.navbar, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={sty.backBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }}>رجوع</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }}>ملف الطالب</Text>
        <View style={{ width: 64 }} />
      </View>

      {/* ── Hero gradient ── */}
      <LinearGradient colors={['#101D36', '#1a2f5c']} style={sty.hero}>
        <View style={sty.avatarRing}>
          <Text style={{ fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 30 * fs }}>{initials}</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color="#ffffff80" />
        ) : student ? (
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
              <View style={[sty.heroBadge, { backgroundColor: student.isActive ? '#22c55e30' : '#ef444430', borderColor: student.isActive ? '#22c55e60' : '#ef444460' }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: student.isActive ? '#22c55e' : '#ef4444' }} />
                <Text style={{ fontFamily: 'Tajawal_500Medium', color: student.isActive ? '#86efac' : '#fca5a5', fontSize: 12 * fs }}>
                  {student.isActive ? 'نشط' : 'موقوف'}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={{ color: '#ffffff60', fontFamily: 'Tajawal_400Regular' }}>لم يُعثر على الطالب</Text>
        )}

        {/* last seen */}
        {activity?.student?.lastSeenAt ? (
          <View style={sty.lastSeenBar}>
            <Ionicons name="time-outline" size={13} color="#D4A843" />
            <Text style={{ fontFamily: 'Tajawal_400Regular', color: '#D4A843', fontSize: 12 * fs }}>
              آخر دخول: {formatDate(activity.student.lastSeenAt)}
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* ── Quick Stats ── */}
      {(activity || actLoading) && (
        <View style={sty.statsRow}>
          {actLoading ? (
            <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
          ) : activity ? (
            <>
              <StatCard label="محاضرة فُتحت" value={activity.stats.totalOpened} icon="play-circle" color="#3b82f6" fs={fs} />
              <StatCard label="مكتملة" value={activity.stats.totalCompleted} icon="checkmark-circle" color="#22c55e" fs={fs} />
              <StatCard label="كورس مشترك" value={enrolledCourses.length} icon="book" color="#D4A843" fs={fs} />
            </>
          ) : null}
        </View>
      )}

      {/* ── معلومات التواصل ── */}
      <View style={[sty.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader title="معلومات التواصل" fs={fs} color={colors.foreground} />
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : contactRows.length === 0 ? (
          <Text style={[sty.emptyTxt, { color: colors.mutedForeground, fontSize: 13 * fs }]}>لا توجد بيانات تواصل</Text>
        ) : (
          contactRows.map((row) => (
            <View key={row.label} style={[sty.infoRow, { borderBottomColor: colors.border }]}>
              <View style={[sty.infoIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={row.icon} size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.foreground, fontSize: 14 * fs, textAlign: 'right' }}>
                  {row.value}
                </Text>
                <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs, textAlign: 'right' }}>
                  {row.label}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── الكورسات المشتركة ── */}
      <View style={[sty.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader title="الكورسات المشترك بها" count={enrolledCourses.length} fs={fs} color={colors.foreground} />
        {enrolledCourses.length === 0 ? (
          <Text style={[sty.emptyTxt, { color: colors.mutedForeground, fontSize: 13 * fs }]}>لا توجد كورسات مشتركة</Text>
        ) : (
          enrolledCourses.map((course) => {
            const ca = activity?.courseActivity?.find(c => c.courseId === course.id);
            const expanded = expandedCourse === course.id;
            return (
              <View key={course.id}>
                <TouchableOpacity
                  onPress={() => setExpandedCourse(expanded ? null : course.id)}
                  style={[sty.courseRow, { borderColor: colors.border }]}
                >
                  <View style={sty.courseRowRight}>
                    <View style={[sty.courseIcon, { backgroundColor: '#D4A84320' }]}>
                      <Ionicons name="book" size={15} color="#D4A843" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Tajawal_500Medium', color: colors.foreground, fontSize: 14 * fs, textAlign: 'right' }}>
                        {course.title}
                      </Text>
                      {ca ? (
                        <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs, textAlign: 'right' }}>
                          {ca.lessonsCompleted}/{ca.lessonsOpened} محاضرة مكتملة
                        </Text>
                      ) : (
                        <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs, textAlign: 'right' }}>
                          لم يفتح أي محاضرة بعد
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
                </TouchableOpacity>

                {/* تفاصيل محاضرات الكورس */}
                {expanded && ca && ca.lessons.length > 0 && (
                  <View style={[sty.lessonList, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {ca.lessons.map((les) => {
                      const ratio = les.lessonDuration && les.lessonDuration > 0
                        ? les.positionSeconds / les.lessonDuration
                        : les.completed ? 1 : 0;
                      return (
                        <View key={les.lessonId} style={[sty.lessonRow, { borderBottomColor: colors.border }]}>
                          <View style={sty.lessonRowTop}>
                            <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs }}>
                              {formatDate(les.updatedAt)}
                            </Text>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 }}>
                              <View style={[sty.typeChip, { backgroundColor: les.completed ? '#22c55e20' : '#f59e0b20' }]}>
                                <Ionicons name={lessonTypeIcon(les.lessonType)} size={10} color={les.completed ? '#22c55e' : '#f59e0b'} />
                                <Text style={{ fontFamily: 'Tajawal_400Regular', color: les.completed ? '#22c55e' : '#f59e0b', fontSize: 10 * fs }}>
                                  {lessonTypeLabel(les.lessonType)}
                                </Text>
                              </View>
                              <Text style={{ fontFamily: 'Tajawal_500Medium', color: colors.foreground, fontSize: 13 * fs, textAlign: 'right', flex: 1 }}>
                                {les.lessonTitle}
                              </Text>
                            </View>
                          </View>
                          {les.lessonType === 'video' && (
                            <View style={sty.progressRow}>
                              <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 10 * fs }}>
                                {fmtDuration(les.positionSeconds)}
                              </Text>
                              <ProgressPill ratio={ratio} completed={les.completed} fs={fs} />
                              {les.completed && (
                                <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
                {expanded && ca && ca.lessons.length === 0 && (
                  <View style={[sty.lessonList, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[sty.emptyTxt, { color: colors.mutedForeground, fontSize: 12 * fs }]}>لم يفتح أي محاضرة بعد</Text>
                  </View>
                )}
                {expanded && !ca && (
                  <TouchableOpacity
                    onPress={() => router.push(`/course/${course.id}`)}
                    style={[sty.lessonList, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                  >
                    <Ionicons name="open-outline" size={14} color={colors.primary} />
                    <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.primary, fontSize: 13 * fs }}>فتح الكورس</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* ── آخر النشاطات ── */}
      {activity && activity.recentActivity.length > 0 && (
        <View style={[sty.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionHeader title="آخر التحركات" count={activity.recentActivity.length} fs={fs} color={colors.foreground} />
          {recentToShow.map((item, i) => (
            <View key={`${item.lessonId}-${i}`} style={[sty.actRow, { borderBottomColor: colors.border }]}>
              <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs, minWidth: 70, textAlign: 'left' }}>
                {formatDate(item.updatedAt)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Tajawal_500Medium', color: colors.foreground, fontSize: 13 * fs, textAlign: 'right' }}>
                  {item.lessonTitle}
                </Text>
                <Text style={{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 11 * fs, textAlign: 'right' }}>
                  {item.courseTitle}
                </Text>
              </View>
              <View style={[sty.actIcon, { backgroundColor: item.completed ? '#22c55e20' : '#3b82f620' }]}>
                <Ionicons name={item.completed ? 'checkmark-circle' : 'play-circle'} size={16} color={item.completed ? '#22c55e' : '#3b82f6'} />
              </View>
            </View>
          ))}
          {activity.recentActivity.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllRecent(!showAllRecent)} style={sty.showMoreBtn}>
              <Text style={{ fontFamily: 'Tajawal_500Medium', color: colors.primary, fontSize: 13 * fs }}>
                {showAllRecent ? 'عرض أقل' : `عرض الكل (${activity.recentActivity.length})`}
              </Text>
              <Ionicons name={showAllRecent ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── ملاحظاتي ── */}
      <View style={[sty.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={sty.noteHeader}>
          <SectionHeader title="ملاحظاتي" fs={fs} color={colors.foreground} />
          {notesSaved && (
            <View style={[sty.savedPill, { backgroundColor: '#22c55e15' }]}>
              <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }}>تم الحفظ</Text>
            </View>
          )}
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
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
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },

  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24, gap: 6 },
  avatarRing: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: 'rgba(212,168,67,0.2)', borderWidth: 2, borderColor: '#D4A84360',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBadges: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  heroBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  lastSeenBar: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    marginTop: 6, backgroundColor: 'rgba(212,168,67,0.12)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,168,67,0.25)',
  },

  statsRow: {
    flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16, paddingTop: 16,
  },
  statCard: {
    flex: 1, alignItems: 'center', borderRadius: 14, borderWidth: 1,
    paddingVertical: 14, gap: 4,
  },
  statVal: { lineHeight: 28 },
  statLabel: { textAlign: 'center' },

  card: {
    marginHorizontal: 16, marginTop: 14, borderRadius: 18, borderWidth: 1, padding: 16, gap: 10,
  },
  secHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  secTitle: {},
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  infoRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  courseRow: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  courseRowRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  courseIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  lessonList: {
    marginTop: 4, borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden',
  },
  lessonRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  lessonRowTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  typeChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  progressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  pillTrack: { flex: 1, height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  pillFill: { height: '100%', borderRadius: 3 },

  actRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  showMoreBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 6,
  },

  emptyTxt: { textAlign: 'center', paddingVertical: 6 },
  noteHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  savedPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 100 },
  saveBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12, gap: 6,
  },
});
