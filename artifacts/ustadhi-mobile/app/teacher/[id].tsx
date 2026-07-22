import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PageHeader } from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { SkeletonBox } from '@/components/SkeletonLoader';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

/* ── Video player component ── */
function TrialVideoPlayer({ uri, onFinish }: { uri: string; onFinish: () => void }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  React.useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying }) => {
      // when playback ends, expo-video sets isPlaying=false and status changes
    });
    return () => sub.remove();
  }, [player]);
  return (
    <View style={styles.videoWrap}>
      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen
        allowsPictureInPicture={false}
      />
      <TouchableOpacity
        style={{ marginTop: 10, alignSelf: 'center' }}
        onPress={onFinish}
      >
        <Text style={{ color: '#3b82f6', fontSize: 13, textAlign: 'center', fontFamily: 'Tajawal_500Medium' }}>
          انتهيت من المشاهدة — اضغط للتقييم
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface TeacherDetail {
  id: number;
  fullName: string;
  bio?: string;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  trialLessonUrl?: string | null;
  trialLessonType?: string;
  isActive: boolean;
  studentsCount: number;
  subjects: { id: number; name: string; icon?: string | null; gradeLevel: string }[];
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

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teacherId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;
  const router = useRouter();

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';

  const { data: teacher, isLoading } = useTeacherDetail(teacherId);

  // ── trial lecture state ────────────────────────────────────────────────
  const [trialStarted, setTrialStarted] = useState(false);
  const [trialDone, setTrialDone] = useState(false);

  // ── quiz state ────────────────────────────────────────────────────────
  const [quizStep, setQuizStep] = useState(-1);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizDone, setQuizDone] = useState(false);

  // ── like/dislike state ────────────────────────────────────────────────
  const [reviewSent, setReviewSent] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [dislikeReason, setDislikeReason] = useState('');
  const [studentName, setStudentName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const QUIZ_QUESTIONS = [
    {
      q: 'كيف تقيّم وضوح الشرح في هذه المحاضرة؟',
      options: ['ممتاز وواضح جداً', 'جيد جداً', 'جيد', 'يحتاج تحسين'],
    },
    {
      q: 'هل أسلوب الأستاذ مشوّق ويساعد على الفهم؟',
      options: ['نعم، بشكل ممتاز', 'نعم، إلى حد ما', 'لا كثيراً', 'لا'],
    },
  ];

  const submitReview = async () => {
    if (liked === null) return;
    if (!liked && !dislikeReason.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة سبب عدم إعجابك');
      return;
    }
    setSubmittingReview(true);
    try {
      await fetch(`${base}/api/teacher-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          liked,
          reason: liked ? null : dislikeReason.trim(),
          studentName: studentName.trim() || null,
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReviewSent(true);
    } catch {
      Alert.alert('خطأ', 'فشل إرسال التقييم، حاول مرة أخرى');
    } finally {
      setSubmittingReview(false);
    }
  };

  const hasTrialVideo = !!teacher?.trialLessonUrl;
  const initials = teacher
    ? teacher.fullName.split(' ').slice(0, 2).map((w: string) => w[0]).join('')
    : '؟';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover image or gradient hero */}
      {teacher?.coverImageUrl ? (
        <View style={styles.coverWrap}>
          <Image source={{ uri: teacher.coverImageUrl }} style={styles.coverImg} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.coverGradient}
          />
          <View style={styles.coverContent}>
            <PageHeader
              title=""
              onBack={() => router.back()}
              backgroundColor="transparent"
              tintColor="#ffffff"
            />
          </View>
        </View>
      ) : (
        <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.hero}>
          <PageHeader
            title="صفحة الأستاذ"
            onBack={() => router.back()}
            backgroundColor="transparent"
            tintColor="#ffffff"
          />
        </LinearGradient>
      )}

      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Avatar */}
        <View style={[styles.avatarWrap, { backgroundColor: colors.primary + '20', borderColor: colors.card }]}>
          {isLoading ? (
            <SkeletonBox width={80} height={80} borderRadius={40} />
          ) : teacher?.avatarUrl ? (
            <Image source={{ uri: teacher.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={[styles.initials, { color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 30 * fs }]}>
              {initials}
            </Text>
          )}
        </View>

        {isLoading ? (
          <View style={{ gap: 8, alignItems: 'center', marginTop: 8 }}>
            <SkeletonBox width={160} height={20} borderRadius={8} />
            <SkeletonBox width={220} height={14} borderRadius={8} />
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 22 * fs }]}>
              {teacher?.fullName}
            </Text>
            {teacher?.bio ? (
              <Text style={[styles.bio, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                {teacher.bio}
              </Text>
            ) : null}
            {/* Stats */}
            <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
                  {teacher?.studentsCount ?? 0}
                </Text>
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>طالب</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
                  {teacher?.subjects?.length ?? 0}
                </Text>
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>مادة</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Subjects */}
      {(teacher?.subjects?.length ?? 0) > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="library" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
              المواد التي يدرّسها
            </Text>
          </View>
          <View style={styles.subjectsRow}>
            {teacher!.subjects.map(sub => (
              <TouchableOpacity
                key={sub.id}
                onPress={() => router.push(`/subject/${sub.id}` as any)}
                style={[styles.subjectPill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              >
                {sub.icon && <Text style={{ fontSize: 14 }}>{sub.icon}</Text>}
                <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_600SemiBold', fontSize: 13 * fs }]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── المحاضرة التجريبية ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="play-circle" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
            المحاضرة التجريبية — مجانية
          </Text>
        </View>

        {!trialStarted ? (
          /* CTA */
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setTrialStarted(true);
            }}
            style={[styles.trialBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
              ابدأ المحاضرة التجريبية
            </Text>
          </TouchableOpacity>
        ) : hasTrialVideo ? (
          /* Real video player */
          <View style={{ gap: 12 }}>
            <TrialVideoPlayer
              uri={teacher!.trialLessonUrl!}
              onFinish={() => { if (!trialDone) { setTrialDone(true); setQuizStep(0); } }}
            />
            {!trialDone && (
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'center' }]}>
                شاهد المحاضرة كاملاً للتقييم
              </Text>
            )}
          </View>
        ) : (
          /* No video configured */
          <View style={[styles.noVideoWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="videocam-off-outline" size={36} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, textAlign: 'center' }]}>
              لم تُضف محاضرة تجريبية بعد
            </Text>
          </View>
        )}
      </View>

      {/* ── Quiz (after video ends) ── */}
      {trialStarted && quizStep >= 0 && !quizDone && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={20} color={colors.gold ?? '#f59e0b'} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
              سؤال {quizStep + 1} / {QUIZ_QUESTIONS.length}
            </Text>
          </View>
          <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs, textAlign: 'right', lineHeight: 26 }]}>
            {QUIZ_QUESTIONS[quizStep].q}
          </Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {QUIZ_QUESTIONS[quizStep].options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const next = [...quizAnswers, i];
                  setQuizAnswers(next);
                  if (quizStep + 1 < QUIZ_QUESTIONS.length) {
                    setQuizStep(quizStep + 1);
                  } else {
                    setQuizDone(true);
                  }
                }}
                style={[styles.optionBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <View style={[styles.optionCircle, { borderColor: colors.primary }]}>
                  <Text style={[{ fontFamily: 'Tajawal_500Medium', color: colors.primary, fontSize: 12 * fs }]}>
                    {['أ', 'ب', 'ج', 'د'][i]}
                  </Text>
                </View>
                <Text style={[{ flex: 1, textAlign: 'right', color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Quiz done — show like/dislike ── */}
      {(quizDone || (trialDone && !hasTrialVideo)) && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="thumbs-up" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
              ما رأيك في المحاضرة؟
            </Text>
          </View>

          {reviewSent ? (
            <View style={styles.reviewSentWrap}>
              <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
                شكراً على تقييمك!
              </Text>
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'center' }]}>
                تم إرسال رأيك للإدارة
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {/* Like / Dislike buttons */}
              <View style={styles.likeRow}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setLiked(true); }}
                  style={[
                    styles.likeBtn,
                    { borderColor: liked === true ? '#10b981' : colors.border, backgroundColor: liked === true ? '#10b981' + '15' : colors.background },
                  ]}
                >
                  <Ionicons name="thumbs-up" size={24} color={liked === true ? '#10b981' : colors.mutedForeground} />
                  <Text style={[{ fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, color: liked === true ? '#10b981' : colors.foreground }]}>
                    أعجبني
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setLiked(false); }}
                  style={[
                    styles.likeBtn,
                    { borderColor: liked === false ? '#ef4444' : colors.border, backgroundColor: liked === false ? '#ef4444' + '15' : colors.background },
                  ]}
                >
                  <Ionicons name="thumbs-down" size={24} color={liked === false ? '#ef4444' : colors.mutedForeground} />
                  <Text style={[{ fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, color: liked === false ? '#ef4444' : colors.foreground }]}>
                    لم يعجبني
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reason (only when disliked) */}
              {liked === false && (
                <View style={{ gap: 8 }}>
                  <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>
                    ما هو السبب؟ *
                  </Text>
                  <TextInput
                    value={dislikeReason}
                    onChangeText={setDislikeReason}
                    placeholder="اكتب سبب عدم إعجابك..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline numberOfLines={3} textAlign="right"
                    style={[styles.reasonInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                  />
                </View>
              )}

              {/* Optional name */}
              {liked !== null && (
                <TextInput
                  value={studentName}
                  onChangeText={setStudentName}
                  placeholder="اسمك (اختياري)..."
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                  style={[styles.nameInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                />
              )}

              {liked !== null && (
                <TouchableOpacity
                  onPress={submitReview}
                  disabled={submittingReview || (!liked && !dislikeReason.trim())}
                  style={[
                    styles.submitBtn,
                    { backgroundColor: liked ? '#10b981' : '#ef4444', opacity: submittingReview ? 0.6 : 1 },
                  ]}
                >
                  {submittingReview
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>إرسال التقييم</Text>}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Cover image hero
  coverWrap: { width: '100%', height: 220, position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  coverContent: { position: 'absolute', top: 0, left: 0, right: 0 },
  hero: { height: 140, justifyContent: 'flex-start' },
  // Profile card
  profileCard: {
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: -50,
  },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  initials: {},
  profileInfo: { alignItems: 'center', gap: 6, width: '100%' },
  name: { textAlign: 'center' },
  bio: { textAlign: 'center', lineHeight: 22 },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 24,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statDivider: { width: 1, alignSelf: 'stretch' },
  // Sections
  section: { marginHorizontal: 16, marginTop: 14, borderRadius: 26, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  sectionTitle: {},
  // Subjects
  subjectsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  subjectPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  // Trial
  trialBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 999, gap: 8 },
  videoWrap: { width: '100%', aspectRatio: 16 / 9, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  noVideoWrap: { alignItems: 'center', gap: 10, paddingVertical: 28, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed' },
  // Quiz
  optionBtn: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 22, borderWidth: 1, padding: 12, gap: 10 },
  optionCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  // Review
  likeRow: { flexDirection: 'row-reverse', gap: 10 },
  likeBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, borderWidth: 1.5, gap: 6 },
  reasonInput: { borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 90, textAlignVertical: 'top' },
  nameInput: { borderWidth: 1, borderRadius: 12, padding: 12 },
  submitBtn: { paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  reviewSentWrap: { alignItems: 'center', gap: 10, paddingVertical: 12 },
});
