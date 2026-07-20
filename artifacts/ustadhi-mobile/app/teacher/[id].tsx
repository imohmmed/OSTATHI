import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PageHeader } from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { ProgressBar } from '@/components/ProgressBar';
import { LessonStepItem } from '@/components/LessonStepItem';
import { SkeletonBox } from '@/components/SkeletonLoader';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface TeacherDetail {
  id: number;
  fullName: string;
  bio?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  studentsCount: number;
  subjects: { id: number; name: string; icon?: string | null; gradeLevel: string }[];
}

interface TrialLesson {
  id: number;
  title: string;
  type: string;
  order: number;
  duration?: number | null;
  isPublished: boolean;
}

interface TrialCourse {
  id: number;
  title: string;
  description?: string;
  lessons: TrialLesson[];
}

function useTeacherDetail(id: number) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<TeacherDetail | null>({
    queryKey: ['teacher-detail', id],
    queryFn: async () => {
      const res = await fetch(`${base}/api/teachers/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
  });
}

function useTrialCourse(teacherId: number) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<TrialCourse | null>({
    queryKey: ['trial-course', teacherId],
    queryFn: async () => {
      // Fetch courses for this teacher where isTrial = true
      const res = await fetch(`${base}/api/courses?teacherId=${teacherId}&isTrial=true`);
      if (!res.ok) return null;
      const courses = await res.json();
      if (!courses.length) return null;
      const course = courses[0];
      // Fetch lessons
      const lessonsRes = await fetch(`${base}/api/courses/${course.id}/lessons`);
      const lessons = lessonsRes.ok ? await lessonsRes.json() : [];
      return { ...course, lessons };
    },
    enabled: !!teacherId,
  });
}

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teacherId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;
  const router = useRouter();

  const { data: teacher, isLoading } = useTeacherDetail(teacherId);
  const { data: trialCourse } = useTrialCourse(teacherId);

  const [showTrialSteps, setShowTrialSteps] = useState(false);
  const [lectureProgress, setLectureProgress] = useState(0);
  const [lectureStarted, setLectureStarted] = useState(false);
  const [quizStep, setQuizStep] = useState(-1);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizDone, setQuizDone] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSent, setReviewSent] = useState(false);

  const QUIZ_QUESTIONS = [
    {
      q: 'ما هو الهدف الأساسي من هذه المحاضرة؟',
      options: ['فهم المفاهيم الأساسية', 'حل الأمثلة المتقدمة', 'المراجعة الشاملة', 'التقييم النهائي'],
      correct: 0,
    },
    {
      q: 'كيف تقيّم أسلوب الشرح؟',
      options: ['ممتاز وواضح', 'جيد جداً', 'جيد', 'يحتاج تحسين'],
      correct: 0,
    },
  ];

  const simulateLecture = () => {
    if (lectureStarted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLectureStarted(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 4;
      setLectureProgress(p);
      if (p >= 100) clearInterval(interval);
    }, 250);
  };

  const answerQuiz = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...quizAnswers, idx];
    setQuizAnswers(next);
    if (quizStep + 1 < QUIZ_QUESTIONS.length) setQuizStep(quizStep + 1);
    else setQuizDone(true);
  };

  const sendReview = () => {
    if (!reviewText.trim()) { Alert.alert('تنبيه', 'يرجى كتابة رأيك أولاً'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReviewSent(true);
  };

  const initials = teacher
    ? teacher.fullName.split(' ').slice(0, 2).map((w: string) => w[0]).join('')
    : '؟';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.hero}>
        <PageHeader
          title="الأستاذ"
          onBack={() => router.back()}
          backgroundColor="transparent"
          tintColor="#ffffff"
        />
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          {isLoading ? (
            <SkeletonBox width={80} height={80} borderRadius={40} />
          ) : (
            <Text style={[styles.initials, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 32 * fs }]}>{initials}</Text>
          )}
        </View>
        {isLoading ? (
          <View style={{ gap: 8, alignItems: 'center' }}>
            <SkeletonBox width={160} height={20} borderRadius={8} />
            <SkeletonBox width={220} height={14} borderRadius={8} />
          </View>
        ) : (
          <>
            <Text style={[styles.name, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs }]}>
              {teacher?.fullName}
            </Text>
            {teacher?.bio && (
              <Text style={[styles.bio, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.75)', fontSize: 14 * fs }]}>
                {teacher.bio}
              </Text>
            )}
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 20 * fs }]}>
                  {teacher?.studentsCount ?? 0}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12 * fs }]}>
                  طالب
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 20 * fs }]}>
                  {teacher?.subjects?.length ?? 0}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12 * fs }]}>
                  مادة
                </Text>
              </View>
            </View>
          </>
        )}
      </LinearGradient>

      {/* Subjects taught */}
      {(teacher?.subjects?.length ?? 0) > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="library" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
              المواد التي يدرّسها
            </Text>
          </View>
          <View style={styles.subjectsRow}>
            {teacher!.subjects.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                onPress={() => router.push(`/subject/${sub.id}`)}
                style={[styles.subjectPill, { backgroundColor: colors.primary }]}
              >
                {sub.icon && <Text style={styles.subjectIcon}>{sub.icon}</Text>}
                <Text style={[styles.subjectName, { color: colors.primaryForeground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Trial lecture button */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="play-circle" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
            المحاضرة التجريبية
          </Text>
        </View>

        {!showTrialSteps ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowTrialSteps(true);
            }}
            style={[styles.trialBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={20} color={colors.primaryForeground} />
            <Text style={[styles.trialBtnText, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
              ابدأ المحاضرة التجريبية
            </Text>
          </TouchableOpacity>
        ) : trialCourse ? (
          /* Show real lesson steps from DB */
          <View style={{ gap: 8 }}>
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', marginBottom: 4 }]}>
              {trialCourse.title}
            </Text>
            {trialCourse.lessons.map((lesson, idx) => (
              <LessonStepItem
                key={lesson.id}
                title={lesson.title}
                type={lesson.type as any}
                order={idx + 1}
                duration={lesson.duration}
                isCompleted={false}
                onPress={() => {}}
              />
            ))}
            {trialCourse.lessons.length === 0 && (
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'center', padding: 12 }]}>
                لا توجد خطوات في هذه المحاضرة بعد
              </Text>
            )}
          </View>
        ) : (
          /* Simulated trial (no trial course configured yet) */
          <View>
            {!lectureStarted ? (
              <TouchableOpacity onPress={simulateLecture} style={[styles.playBtn, { backgroundColor: colors.muted }]}>
                <Ionicons name="play-circle" size={20} color={colors.primary} />
                <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>تشغيل عينة المحاضرة</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={[styles.videoPlaceholder, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Ionicons
                    name={lectureProgress < 100 ? 'radio-button-on' : 'checkmark-circle'}
                    size={40}
                    color={lectureProgress < 100 ? colors.primary : colors.success}
                  />
                  <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>
                    {lectureProgress < 100 ? `${lectureProgress}% مشاهدة` : 'اكتملت المحاضرة'}
                  </Text>
                </View>
                <ProgressBar progress={lectureProgress} showLabel />
              </View>
            )}

            {lectureProgress >= 100 && quizStep === -1 && !quizDone && (
              <TouchableOpacity
                onPress={() => { setQuizStep(0); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                style={[styles.startQuizBtn, { backgroundColor: colors.muted, borderColor: colors.border, marginTop: 10 }]}
              >
                <Ionicons name="help-circle" size={18} color={colors.primary} />
                <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>ابدأ الاختبار</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Quiz (simulated mode) */}
      {showTrialSteps && !trialCourse && quizStep >= 0 && !quizDone && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={20} color={colors.gold} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
              سؤال {quizStep + 1} / {QUIZ_QUESTIONS.length}
            </Text>
          </View>
          <ProgressBar progress={(quizStep / QUIZ_QUESTIONS.length) * 100} />
          <Text style={[styles.question, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
            {QUIZ_QUESTIONS[quizStep].q}
          </Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {QUIZ_QUESTIONS[quizStep].options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => answerQuiz(i)}
                style={[styles.optionBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <View style={[styles.optionCircle, { borderColor: colors.border }]}>
                  <Text style={[{ fontFamily: 'Tajawal_500Medium', color: colors.foreground, fontSize: 12 * fs }]}>
                    {['أ', 'ب', 'ج', 'د'][i]}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Quiz done */}
      {quizDone && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.quizResult}>
            <Ionicons name="checkmark-circle" size={50} color={colors.success} />
            <Text style={[{ fontFamily: 'Tajawal_700Bold', color: colors.foreground, fontSize: 20 * fs }]}>أحسنت!</Text>
            <Text style={[{ fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, fontSize: 14 * fs }]}>
              أكملت الاختبار التجريبي بنجاح
            </Text>
          </View>
        </View>
      )}

      {/* Review form */}
      {quizDone && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={20} color={colors.gold} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
              أرسل رأيك
            </Text>
          </View>
          {reviewSent ? (
            <View style={styles.quizResult}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
              <Text style={[{ fontFamily: 'Tajawal_700Bold', color: colors.foreground, fontSize: 15 * fs }]}>شكراً على رأيك!</Text>
            </View>
          ) : (
            <>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => { setReviewRating(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Ionicons name={s <= reviewRating ? 'star' : 'star-outline'} size={28} color={s <= reviewRating ? colors.gold : colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="اكتب رأيك..."
                placeholderTextColor={colors.mutedForeground}
                multiline numberOfLines={4} textAlign="right"
                style={[styles.reviewInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
              />
              <TouchableOpacity onPress={sendReview} style={[styles.sendReviewBtn, { backgroundColor: colors.primary }]}>
                <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>إرسال</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 0, paddingBottom: 28, gap: 10, paddingHorizontal: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  initials: {},
  name: {},
  bio: { textAlign: 'center', lineHeight: 22 },
  statsRow: { flexDirection: 'row-reverse', gap: 24, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', width: '100%', justifyContent: 'center' },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: {},
  statLabel: {},
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  section: { marginHorizontal: 16, marginTop: 14, borderRadius: 26, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  sectionTitle: {},
  subjectsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  subjectPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  subjectIcon: { fontSize: 16 },
  subjectName: {},
  trialBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 999, gap: 8 },
  trialBtnText: {},
  playBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 999, gap: 8 },
  videoPlaceholder: { height: 140, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  startQuizBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 999, borderWidth: 1, gap: 6 },
  question: { textAlign: 'right', lineHeight: 26 },
  optionBtn: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 22, borderWidth: 1, padding: 12, gap: 10 },
  optionCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, textAlign: 'right' },
  quizResult: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  starRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6 },
  reviewInput: { borderWidth: 1, borderRadius: 24, padding: 12, minHeight: 90, textAlignVertical: 'top' },
  sendReviewBtn: { paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
});
