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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { ProgressBar } from '@/components/ProgressBar';
import { useGetTeachers } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

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

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teacherId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;

  const { data: teachers } = useGetTeachers();
  const teacher = teachers?.find((t) => t.id === teacherId);

  const [lectureProgress, setLectureProgress] = useState(0);
  const [lectureStarted, setLectureStarted] = useState(false);
  const [quizStep, setQuizStep] = useState(-1); // -1 = not started, 0+ = question index
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizDone, setQuizDone] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSent, setReviewSent] = useState(false);

  const simulateLecture = () => {
    if (lectureStarted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLectureStarted(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setLectureProgress(p);
      if (p >= 100) clearInterval(interval);
    }, 300);
  };

  const answerQuiz = (optionIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...quizAnswers, optionIdx];
    setQuizAnswers(next);
    if (quizStep + 1 < QUIZ_QUESTIONS.length) {
      setQuizStep(quizStep + 1);
    } else {
      setQuizDone(true);
    }
  };

  const sendReview = () => {
    if (!reviewText.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة رأيك أولاً');
      return;
    }
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
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={[styles.initials, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 32 * fs }]}>{initials}</Text>
        </View>
        <Text style={[styles.name, { fontFamily: 'Tajawal_700Bold', color: '#fff', fontSize: 22 * fs }]}>
          {teacher?.fullName ?? 'جاري التحميل...'}
        </Text>
        {teacher?.bio && (
          <Text style={[styles.bio, { fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.75)', fontSize: 14 * fs }]}>
            {teacher.bio}
          </Text>
        )}
      </LinearGradient>

      {/* Trial Lecture */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="play-circle" size={22} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
            المحاضرة التجريبية
          </Text>
        </View>

        {!lectureStarted ? (
          <TouchableOpacity
            onPress={simulateLecture}
            style={[styles.playBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={20} color={colors.primaryForeground} />
            <Text style={[styles.playBtnText, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
              تشغيل المحاضرة
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.lecturePlayer}>
            <View style={[styles.videoPlaceholder, { backgroundColor: colors.primary + '20', borderColor: colors.border }]}>
              <Ionicons name={lectureProgress < 100 ? 'radio-button-on' : 'checkmark-circle'} size={40}
                color={lectureProgress < 100 ? colors.primary : colors.success} />
              <Text style={[styles.videoStatus, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }]}>
                {lectureProgress < 100 ? `${lectureProgress}% مشاهدة` : 'اكتملت المحاضرة'}
              </Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <ProgressBar progress={lectureProgress} showLabel />
            </View>
          </View>
        )}

        {lectureProgress >= 100 && quizStep === -1 && !quizDone && (
          <TouchableOpacity
            onPress={() => { setQuizStep(0); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={[styles.startQuizBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Ionicons name="help-circle" size={18} color={colors.primary} />
            <Text style={[styles.startQuizText, { color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
              ابدأ الاختبار
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quiz */}
      {quizStep >= 0 && !quizDone && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={22} color={colors.gold} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
              سؤال {quizStep + 1} / {QUIZ_QUESTIONS.length}
            </Text>
          </View>
          <ProgressBar progress={((quizStep) / QUIZ_QUESTIONS.length) * 100} />
          <Text style={[styles.question, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 16 * fs, marginTop: 14 }]}>
            {QUIZ_QUESTIONS[quizStep].q}
          </Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {QUIZ_QUESTIONS[quizStep].options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => answerQuiz(i)}
                style={[styles.optionBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <View style={[styles.optionCircle, { borderColor: colors.border }]}>
                  <Text style={[{ fontFamily: 'Tajawal_500Medium', color: colors.foreground, fontSize: 13 * fs }]}>
                    {['أ', 'ب', 'ج', 'د'][i]}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Quiz Result */}
      {quizDone && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.quizResult}>
            <Ionicons name="checkmark-circle" size={50} color={colors.success} />
            <Text style={[styles.quizResultTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
              أحسنت!
            </Text>
            <Text style={[styles.quizResultSub, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
              أكملت الاختبار التجريبي بنجاح
            </Text>
          </View>
        </View>
      )}

      {/* Review */}
      {quizDone && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={22} color={colors.gold} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
              أرسل رأيك
            </Text>
          </View>

          {reviewSent ? (
            <View style={styles.reviewSent}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                شكراً على رأيك!
              </Text>
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
                placeholder="اكتب رأيك عن المحاضرة والأستاذ..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlign="right"
                style={[styles.reviewInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
              />
              <TouchableOpacity
                onPress={sendReview}
                style={[styles.sendReviewBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                  إرسال الرأي
                </Text>
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
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
    gap: 10,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  initials: {},
  name: {},
  bio: { textAlign: 'center', lineHeight: 22 },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  sectionTitle: {},
  playBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  playBtnText: {},
  lecturePlayer: {},
  videoPlaceholder: { height: 150, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  videoStatus: {},
  startQuizBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  startQuizText: {},
  question: { textAlign: 'right', lineHeight: 26 },
  optionBtn: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, gap: 10 },
  optionCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, textAlign: 'right' },
  quizResult: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  quizResultTitle: {},
  quizResultSub: {},
  starRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6 },
  reviewInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 100, textAlignVertical: 'top' },
  sendReviewBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  reviewSent: { alignItems: 'center', gap: 8, paddingVertical: 10 },
});
