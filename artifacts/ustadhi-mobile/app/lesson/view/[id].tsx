/**
 * Student lesson viewer — video player with like/dislike, download, steps list.
 * Route: /lesson/view/[id]?courseId=<courseId>
 *
 * Supports: mp4, m3u8 (HLS), direct file URLs
 * Features: streaming, fullscreen, PiP, progress tracking, offline download
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PageHeader } from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Lazy-load VideoPlayer so react-native-video is only registered
// when a video lesson is actually rendered (avoids crash on non-video lessons)
const VideoPlayer = React.lazy(() =>
  import('@/components/VideoPlayer').then(m => ({ default: m.VideoPlayer }))
);
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGetCourse } from '@workspace/api-client-react';

const API_BASE = (() => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : '/api';
})();

const { width: SW } = Dimensions.get('window');
const VIDEO_H = Math.round(SW * 9 / 16); // 16:9

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const progressKey = (id: number) => `video_pos_${id}`;

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  video: 'play-circle', pdf: 'document', richtext: 'create',
  link: 'earth', livestream: 'radio', mcq: 'radio-button-on',
  true_false: 'checkmark-circle', fill_blank: 'pencil', qa: 'help-circle',
  quiz: 'school', assignment: 'clipboard', text: 'document-text',
};
const TYPE_COLOR: Record<string, string> = {
  video: '#3b82f6', pdf: '#ef4444', richtext: '#8b5cf6',
  link: '#10b981', livestream: '#f59e0b', mcq: '#06b6d4',
  true_false: '#22c55e', fill_blank: '#a855f7', qa: '#f97316',
  quiz: '#ec4899', assignment: '#64748b', text: '#6b7280',
};
const TYPE_AR: Record<string, string> = {
  video: 'فيديو', pdf: 'ملف PDF', richtext: 'نص', link: 'رابط',
  livestream: 'بث مباشر', mcq: 'اختيار متعدد', true_false: 'صح / خطأ',
  fill_blank: 'ملء الفراغات', qa: 'أسئلة', quiz: 'اختبار', assignment: 'واجب',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LessonViewerScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const lessonId = Number(id);
  const cId = Number(courseId);

  const router = useRouter();
  const colors = useColors();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const insets = useSafeAreaInsets();

  const { data: course } = useGetCourse(cId);
  const lessons: any[] = course?.lessons ?? [];
  const lesson = lessons.find((l) => l.id === lessonId);

  const videoUrl: string = lesson?.contentUrl ?? '';
  const isVideoLesson = lesson?.type === 'video' || lesson?.type === 'livestream';
  const isQuizLesson  = ['mcq', 'true_false', 'fill_blank', 'qa', 'quiz'].includes(lesson?.type ?? '');

  // ── Quiz state ───────────────────────────────────────────────────────────────
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizLoading, setQuizLoading]     = useState(false);
  const [quizDone, setQuizDone]           = useState(false);
  const [currentQ, setCurrentQ]           = useState(0);
  const [userAnswers, setUserAnswers]      = useState<Record<number, string>>({});
  const [revealed, setRevealed]           = useState(false);
  const [fillInput, setFillInput]         = useState('');

  const fetchQuiz = useCallback(async () => {
    if (!isQuizLesson) return;
    setQuizLoading(true);
    try {
      const r = await fetch(`${API_BASE}/lessons/${lessonId}/quizzes`);
      if (r.ok) setQuizQuestions(await r.json());
    } catch {}
    setQuizLoading(false);
  }, [lessonId, isQuizLesson]);

  // ── Reactions state ─────────────────────────────────────────────────────────
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [myReaction, setMyReaction] = useState<'like' | 'dislike' | null>(null);
  const [reactLoading, setReactLoading] = useState(false);
  // Dislike feedback modal
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  // ── Download state ──────────────────────────────────────────────────────────
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);

  // ── Video progress ──────────────────────────────────────────────────────────
  const [savedPosition, setSavedPosition] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const studentId = user?.role === 'student' ? user.id : null;

  // ─── Fetch reactions ────────────────────────────────────────────────────────
  const fetchReactions = useCallback(async () => {
    try {
      const url = `${API_BASE}/lessons/${lessonId}/reactions${studentId ? `?studentId=${studentId}` : ''}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        setLikes(data.likes ?? 0);
        setDislikes(data.dislikes ?? 0);
        setMyReaction(data.myReaction ?? null);
      }
    } catch {}
  }, [lessonId, studentId]);

  // ─── Fetch saved video progress ─────────────────────────────────────────────
  const fetchProgress = useCallback(async () => {
    try {
      // First try local cache
      const local = await AsyncStorage.getItem(progressKey(lessonId));
      if (local) { setSavedPosition(parseFloat(local)); }

      // Then sync from server (if student logged in)
      if (studentId) {
        const r = await fetch(`${API_BASE}/lessons/${lessonId}/progress?studentId=${studentId}`);
        if (r.ok) {
          const data = await r.json();
          const serverPos = data.positionSeconds ?? 0;
          // Use whichever is larger
          if (serverPos > (local ? parseFloat(local) : 0)) {
            setSavedPosition(serverPos);
            await AsyncStorage.setItem(progressKey(lessonId), String(serverPos));
          }
        }
      }
    } catch {}
    setProgressLoaded(true);
  }, [lessonId, studentId]);

  // ─── Check for locally downloaded file ──────────────────────────────────────
  const checkLocalFile = useCallback(async () => {
    if (!videoUrl) return;
    const ext = videoUrl.split('?')[0].split('.').pop() ?? 'mp4';
    const fname = `lesson_${lessonId}.${ext}`;
    const uri = FileSystem.documentDirectory + fname;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) setLocalUri(uri);
    } catch {}
  }, [lessonId, videoUrl]);

  useEffect(() => {
    fetchReactions();
    fetchProgress();
    checkLocalFile();
    fetchQuiz();
  }, [fetchReactions, fetchProgress, checkLocalFile, fetchQuiz]);

  // ─── Quiz helpers ────────────────────────────────────────────────────────────
  const q = quizQuestions[currentQ];
  const totalQ = quizQuestions.length;
  const chosenAnswer = q ? userAnswers[q.id] : undefined;
  const isCorrect = chosenAnswer !== undefined && q?.correctAnswer &&
    chosenAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

  const handleAnswer = useCallback((answer: string) => {
    if (!q || revealed) return;
    setUserAnswers(prev => ({ ...prev, [q.id]: answer }));
    setRevealed(true);
    setFillInput('');
  }, [q, revealed]);

  const handleNext = useCallback(() => {
    if (currentQ < totalQ - 1) {
      setCurrentQ(i => i + 1);
      setRevealed(false);
      setFillInput('');
    } else {
      setQuizDone(true);
    }
  }, [currentQ, totalQ]);

  const resetQuiz = useCallback(() => {
    setCurrentQ(0);
    setUserAnswers({});
    setRevealed(false);
    setQuizDone(false);
    setFillInput('');
  }, []);

  const quizScore = quizQuestions.reduce((acc, qq) => {
    const ans = userAnswers[qq.id];
    if (ans && qq.correctAnswer &&
        ans.trim().toLowerCase() === qq.correctAnswer.trim().toLowerCase()) {
      return acc + (qq.points ?? 1);
    }
    return acc;
  }, 0);
  const maxScore = quizQuestions.reduce((acc, qq) => acc + (qq.points ?? 1), 0);

  // ─── Video URL ───────────────────────────────────────────────────────────────
  const resolvedUrl = localUri ?? (videoUrl || null);

  // ─── Save progress (called by VideoPlayer every 5 s) ─────────────────────────
  const saveProgress = useCallback(async (pos: number) => {
    try {
      await AsyncStorage.setItem(progressKey(lessonId), String(pos));
      if (studentId) {
        await fetch(`${API_BASE}/lessons/${lessonId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, positionSeconds: pos }),
        });
      }
    } catch {}
  }, [lessonId, studentId]);

  // VideoPlayer component handles its own save-on-interval + save-on-unmount
  // via onSaveProgress prop — nothing needed here.

  // ─── React (like / dislike) ─────────────────────────────────────────────────
  const handleReact = async (reaction: 'like' | 'dislike', feedback?: string) => {
    if (!studentId) { Alert.alert('تنبيه', 'يجب تسجيل الدخول أولاً'); return; }
    if (reactLoading) return;

    // إذا دوس "لم يعجبني" وليس إلغاء → نفتح المودال أولاً
    if (reaction === 'dislike' && myReaction !== 'dislike' && feedback === undefined) {
      setFeedbackVisible(true);
      return;
    }

    setReactLoading(true);
    const newReaction = myReaction === reaction ? null : reaction;

    // Optimistic update
    setMyReaction(newReaction);
    setLikes(prev => {
      if (reaction === 'like') return newReaction ? prev + 1 : prev - 1;
      if (myReaction === 'like') return prev - 1; // switching from like to dislike
      return prev;
    });
    setDislikes(prev => {
      if (reaction === 'dislike') return newReaction ? prev + 1 : prev - 1;
      if (myReaction === 'dislike') return prev - 1;
      return prev;
    });

    try {
      await fetch(`${API_BASE}/lessons/${lessonId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, reaction: newReaction, feedback: feedback ?? null }),
      });
      await fetchReactions(); // sync actual counts
    } catch {}
    setReactLoading(false);
  };

  // ─── Submit dislike feedback ─────────────────────────────────────────────────
  const handleSubmitFeedback = async () => {
    setFeedbackSending(true);
    await handleReact('dislike', feedbackText.trim());
    setFeedbackSending(false);
    setFeedbackVisible(false);
    setFeedbackText('');
  };

  // ─── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!videoUrl) { Alert.alert('خطأ', 'لا يوجد رابط للتحميل'); return; }
    if (videoUrl.includes('.m3u8')) {
      Alert.alert('تنبيه', 'روابط HLS (m3u8) لا يمكن تحميلها مباشرة — استخدم روابط mp4 للتحميل');
      return;
    }
    if (localUri) {
      Alert.alert('تم التحميل مسبقاً', 'الفيديو محفوظ على جهازك');
      return;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('خطأ', 'لا يوجد إذن للوصول للملفات');
      return;
    }

    try {
      const ext = videoUrl.split('?')[0].split('.').pop() ?? 'mp4';
      const fname = `lesson_${lessonId}.${ext}`;
      const dest = FileSystem.documentDirectory + fname;

      setDownloadProgress(0);
      const dl = FileSystem.createDownloadResumable(
        videoUrl,
        dest,
        {},
        (prog) => {
          const pct = prog.totalBytesExpectedToWrite > 0
            ? prog.totalBytesWritten / prog.totalBytesExpectedToWrite
            : 0;
          setDownloadProgress(pct);
        }
      );

      const result = await dl.downloadAsync();
      if (result?.uri) {
        setLocalUri(result.uri);
        setDownloadProgress(null);
        try { await MediaLibrary.createAssetAsync(result.uri); } catch {}
        Alert.alert('✓ تم التحميل', 'يمكنك مشاهدة الفيديو بدون إنترنت الآن');
      }
    } catch (e) {
      setDownloadProgress(null);
      Alert.alert('خطأ', 'فشل التحميل، حاول مجدداً');
    }
  };

  // ─── Lesson step press ───────────────────────────────────────────────────────
  const handleStepPress = (l: any) => {
    if (l.id === lessonId) return;
    router.replace({
      pathname: '/lesson/view/[id]' as any,
      params: { id: l.id, courseId: cId },
    });
  };

  // ─── Render lesson step ──────────────────────────────────────────────────────
  const renderStep = ({ item, index }: { item: any; index: number }) => {
    const isActive = item.id === lessonId;
    const color = TYPE_COLOR[item.type] ?? '#6b7280';
    const icon = (TYPE_ICON[item.type] ?? 'document') as keyof typeof Ionicons.glyphMap;
    return (
      <TouchableOpacity
        onPress={() => handleStepPress(item)}
        activeOpacity={0.7}
        style={[S.stepRow, {
          backgroundColor: isActive ? '#101D36' : colors.card,
          borderColor: isActive ? '#D4A843' : colors.border,
        }]}
      >
        {/* Left: step number circle */}
        <View style={[S.stepNum, { borderColor: isActive ? '#D4A843' : colors.border }]}>
          <Text style={[S.stepNumText, { color: isActive ? '#D4A843' : colors.mutedForeground }]}>{index + 1}</Text>
        </View>

        {/* Middle: info */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            numberOfLines={2}
            style={[S.stepTitle, { color: isActive ? '#fff' : colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}
          >
            {item.title}
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View style={[S.typePill, { backgroundColor: color + '22', borderColor: color + '50' }]}>
              <Ionicons name={icon} size={11} color={color} />
              <Text style={{ color, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }}>{TYPE_AR[item.type] ?? item.type}</Text>
            </View>
            {item.duration && (
              <Text style={{ color: isActive ? 'rgba(255,255,255,0.6)' : colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }}>
                {fmt(item.duration)}
              </Text>
            )}
          </View>
        </View>

        {/* Right: thumbnail / icon */}
        <View style={[S.stepIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Quiz UI ─────────────────────────────────────────────────────────────────
  const renderQuiz = () => {
    if (quizLoading) {
      return (
        <View style={[S.quizWrap, { alignItems: 'center', justifyContent: 'center', minHeight: 200 }]}>
          <ActivityIndicator size="large" color="#D4A843" />
        </View>
      );
    }

    if (totalQ === 0) {
      return (
        <View style={[S.quizWrap, { alignItems: 'center', justifyContent: 'center', minHeight: 180 }]}>
          <Ionicons name="help-circle-outline" size={52} color="rgba(212,168,67,0.4)" />
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, marginTop: 12, textAlign: 'center' }}>
            لا توجد أسئلة بعد
          </Text>
        </View>
      );
    }

    // ── Results screen ──────────────────────────────────────────────────────────
    if (quizDone) {
      const pct = maxScore > 0 ? Math.round((quizScore / maxScore) * 100) : 0;
      const passed = pct >= 60;
      return (
        <View style={S.quizWrap}>
          <View style={S.resultCard}>
            <Text style={[S.resultEmoji]}>{passed ? '🎉' : '💪'}</Text>
            <Text style={[S.resultTitle, { color: colors.foreground }]}>
              {passed ? 'أحسنت!' : 'حاول مجدداً'}
            </Text>
            <Text style={[S.resultScore, { color: passed ? '#22c55e' : '#ef4444' }]}>
              {quizScore} / {maxScore}
            </Text>
            <Text style={[S.resultPct, { color: colors.mutedForeground }]}>{pct}%</Text>

            {/* Per-question breakdown */}
            <View style={S.resultBreakdown}>
              {quizQuestions.map((qq, i) => {
                const ans = userAnswers[qq.id];
                const ok = ans && qq.correctAnswer &&
                  ans.trim().toLowerCase() === qq.correctAnswer.trim().toLowerCase();
                return (
                  <View key={qq.id} style={S.resultRow}>
                    <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={18}
                      color={ok ? '#22c55e' : '#ef4444'} />
                    <Text style={[S.resultRowText, { color: colors.foreground }]} numberOfLines={2}>
                      {i + 1}. {qq.question}
                    </Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity onPress={resetQuiz} style={[S.quizBtn, S.quizBtnPrimary]}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={[S.quizBtnText, { color: '#fff' }]}>إعادة الاختبار</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── Question screen ─────────────────────────────────────────────────────────
    const isMCQ       = q.type === 'multiple_choice';
    const isTF        = q.type === 'true_false';
    const isFill      = q.type === 'fill_blank' || q.type === 'short_answer';

    return (
      <View style={S.quizWrap}>
        {/* Progress bar */}
        <View style={S.progressTrack}>
          <View style={[S.progressFill, { width: `${((currentQ) / totalQ) * 100}%` as any }]} />
        </View>
        <Text style={[S.progressText, { color: colors.mutedForeground }]}>
          سؤال {currentQ + 1} من {totalQ}
        </Text>

        {/* Question card */}
        <View style={[S.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[S.questionText, { color: colors.foreground }]}>{q.question}</Text>
          {q.points > 1 && (
            <Text style={[S.questionPoints, { color: '#D4A843' }]}>{q.points} نقاط</Text>
          )}
        </View>

        {/* MCQ options */}
        {isMCQ && (q.options ?? []).length > 0 && (
          <View style={S.optionsList}>
            {(q.options as string[]).map((opt, i) => {
              const chosen = chosenAnswer === opt;
              const correct = revealed && q.correctAnswer === opt;
              const wrong   = revealed && chosen && !correct;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleAnswer(opt)}
                  disabled={revealed}
                  style={[
                    S.optionBtn,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    correct && S.optionCorrect,
                    wrong   && S.optionWrong,
                    chosen && !revealed && S.optionSelected,
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={[S.optionLetter, { backgroundColor: '#101D36' + '20' }]}>
                    <Text style={{ color: '#101D36', fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }}>
                      {String.fromCharCode(65 + i)}
                    </Text>
                  </View>
                  <Text style={[S.optionText, { color: colors.foreground }]}>{opt}</Text>
                  {correct && <Ionicons name="checkmark-circle" size={20} color="#22c55e" />}
                  {wrong   && <Ionicons name="close-circle"     size={20} color="#ef4444" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* True / False */}
        {isTF && (
          <View style={S.tfRow}>
            {(['صح', 'خطأ'] as const).map((opt) => {
              const chosen  = chosenAnswer === opt;
              const correct = revealed && q.correctAnswer === opt;
              const wrong   = revealed && chosen && !correct;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => handleAnswer(opt)}
                  disabled={revealed}
                  style={[
                    S.tfBtn,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    correct && S.optionCorrect,
                    wrong   && S.optionWrong,
                    chosen && !revealed && S.optionSelected,
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 28 }}>{opt === 'صح' ? '✅' : '❌'}</Text>
                  <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Fill in the blank / Short answer */}
        {isFill && (
          <View style={S.fillWrap}>
            <TextInput
              value={fillInput}
              onChangeText={setFillInput}
              placeholder="اكتب إجابتك هنا..."
              placeholderTextColor={colors.mutedForeground}
              editable={!revealed}
              style={[S.fillInput, {
                color: colors.foreground, borderColor: colors.border,
                backgroundColor: colors.background, fontFamily: 'Tajawal_400Regular',
                fontSize: 15 * fs,
              }]}
              textAlign="right"
            />
            {!revealed && (
              <TouchableOpacity
                onPress={() => fillInput.trim() && handleAnswer(fillInput.trim())}
                style={[S.quizBtn, S.quizBtnPrimary, { marginTop: 10 }]}
              >
                <Text style={[S.quizBtnText, { color: '#fff' }]}>تأكيد الإجابة</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Explanation after reveal */}
        {revealed && (
          <View style={[S.explanationBox, {
            backgroundColor: isCorrect ? '#22c55e18' : '#ef444418',
            borderColor:     isCorrect ? '#22c55e50' : '#ef444450',
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={20} color={isCorrect ? '#22c55e' : '#ef4444'} />
              <Text style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }}>
                {isCorrect ? 'إجابة صحيحة!' : `خطأ — الصحيح: ${q.correctAnswer}`}
              </Text>
            </View>
            {q.explanation ? (
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right' }}>
                {q.explanation}
              </Text>
            ) : null}
          </View>
        )}

        {/* Next button */}
        {revealed && (
          <TouchableOpacity onPress={handleNext} style={[S.quizBtn, S.quizBtnPrimary]}>
            <Text style={[S.quizBtnText, { color: '#fff' }]}>
              {currentQ < totalQ - 1 ? 'السؤال التالي' : 'إنهاء الاختبار'}
            </Text>
            <Ionicons name={currentQ < totalQ - 1 ? 'arrow-back' : 'flag'} size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── Header: video + lesson info + action bar ────────────────────────────────
  const renderHeader = () => (
    <View>
      {/* ── Video player (react-native-video — Dev Build only) ── */}
      {isVideoLesson && resolvedUrl ? (
        <React.Suspense fallback={
          <View style={{ height: VIDEO_H, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#D4A843" />
          </View>
        }>
          <VideoPlayer
            source={resolvedUrl}
            savedPosition={savedPosition}
            onSaveProgress={saveProgress}
            height={VIDEO_H}
            localBadge={!!localUri}
          />
        </React.Suspense>
      ) : isVideoLesson && !resolvedUrl ? (
        <View style={[S.videoWrap, { height: VIDEO_H, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="videocam-off-outline" size={40} color="rgba(255,255,255,0.3)" />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, marginTop: 8 }}>
            لا يوجد رابط فيديو
          </Text>
        </View>
      ) : null}

      {/* ── Quiz / Exam ── */}
      {isQuizLesson && renderQuiz()}

      {/* ── Lesson title ── */}
      <View style={[S.titleRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[S.lessonTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]} numberOfLines={3}>
          {lesson?.title ?? '...'}
        </Text>
        {course?.title && (
          <Text style={[S.courseSubtitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
            {course.title}
          </Text>
        )}
      </View>

      {/* ── Action bar: like / dislike / download ── */}
      <View style={[S.actionBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {/* Like */}
        <TouchableOpacity onPress={() => handleReact('like')} style={S.actionBtn} activeOpacity={0.7}>
          <Ionicons
            name={myReaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
            size={22}
            color={myReaction === 'like' ? '#22c55e' : colors.mutedForeground}
          />
          <Text style={[S.actionLabel, { color: myReaction === 'like' ? '#22c55e' : colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
            {likes > 0 ? `👍 ${likes}` : '👍'}
          </Text>
        </TouchableOpacity>

        <View style={[S.actionDivider, { backgroundColor: colors.border }]} />

        {/* Dislike */}
        <TouchableOpacity onPress={() => handleReact('dislike')} style={S.actionBtn} activeOpacity={0.7}>
          <Ionicons
            name={myReaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
            size={22}
            color={myReaction === 'dislike' ? '#ef4444' : colors.mutedForeground}
          />
          <Text style={[S.actionLabel, { color: myReaction === 'dislike' ? '#ef4444' : colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
            {dislikes > 0 ? `👎 ${dislikes}` : '👎'}
          </Text>
        </TouchableOpacity>

        <View style={[S.actionDivider, { backgroundColor: colors.border }]} />

        {/* Rating display */}
        <View style={S.actionBtn}>
          <View style={{ flexDirection: 'row', gap: 1 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const total = likes + dislikes;
              const ratio = total > 0 ? likes / total : 0;
              const filled = star <= Math.round(ratio * 5);
              return (
                <Ionicons key={star} name={filled ? 'star' : 'star-outline'} size={14} color="#D4A843" />
              );
            })}
          </View>
          <Text style={[S.actionLabel, { color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>
            {likes + dislikes > 0 ? `${likes + dislikes} تقييم` : 'التقييم'}
          </Text>
        </View>

        {isVideoLesson && (
          <>
            <View style={[S.actionDivider, { backgroundColor: colors.border }]} />
            {/* Download */}
            <TouchableOpacity
              onPress={handleDownload}
              style={S.actionBtn}
              activeOpacity={0.7}
              disabled={downloadProgress !== null}
            >
              {downloadProgress !== null ? (
                <>
                  <ActivityIndicator size="small" color="#D4A843" />
                  <Text style={[S.actionLabel, { color: '#D4A843', fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>
                    {Math.round(downloadProgress * 100)}%
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name={localUri ? 'checkmark-circle' : 'cloud-download-outline'}
                    size={22}
                    color={localUri ? '#22c55e' : colors.mutedForeground}
                  />
                  <Text style={[S.actionLabel, { color: localUri ? '#22c55e' : colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                    {localUri ? 'محفوظ' : 'تحميل'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Steps header ── */}
      {lessons.length > 1 && (
        <View style={[S.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Ionicons name="list-outline" size={16} color={colors.mutedForeground} />
          <Text style={[S.sectionTitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
            محتوى الدورة · {lessons.length} محاضرة
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[S.screen, { backgroundColor: colors.background }]}>
      <PageHeader
        title={lesson?.title ?? 'المحاضرة'}
        onBack={() => router.back()}
        backgroundColor="#101D36"
        tintColor="#ffffff"
      />

      {/* ── مودال التقييم السلبي ── */}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={S.modalOverlay}>
          <View style={[S.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[S.modalTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
              ما الذي لم يعجبك؟
            </Text>
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', marginBottom: 12 }]}>
              رأيك يساعدنا على تحسين المحتوى (اختياري)
            </Text>
            <TextInput
              style={[S.feedbackInput, {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
                fontFamily: 'Tajawal_400Regular',
                fontSize: 14 * fs,
                textAlign: 'right',
              }]}
              placeholder="اكتب ملاحظتك هنا..."
              placeholderTextColor={colors.mutedForeground}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={S.modalBtns}>
              <TouchableOpacity
                onPress={() => { setFeedbackVisible(false); setFeedbackText(''); }}
                style={[S.modalBtn, { backgroundColor: colors.muted }]}
                disabled={feedbackSending}
              >
                <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitFeedback}
                style={[S.modalBtn, { backgroundColor: '#ef4444', flex: 1.5 }]}
                disabled={feedbackSending}
              >
                <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }}>
                  {feedbackSending ? 'جاري الإرسال...' : 'إرسال التقييم'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={lessons}
        keyExtractor={(l) => String(l.id)}
        renderItem={renderStep}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border + '60' }} />}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  navBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, alignItems: 'center' },
  navTitle: { color: '#fff', flex: 1, textAlign: 'center' },

  // Video
  // Placeholder when no video URL
  videoWrap: { width: '100%', backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center' },

  // ── Quiz ────────────────────────────────────────────────────────────────────
  quizWrap: { padding: 16, gap: 14 },

  progressTrack: {
    height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden', marginBottom: 2,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#D4A843' },
  progressText: { textAlign: 'right', fontFamily: 'Tajawal_500Medium', fontSize: 12 },

  questionCard: {
    borderRadius: 14, borderWidth: 1, padding: 18, gap: 8,
  },
  questionText: {
    fontFamily: 'Tajawal_700Bold', fontSize: 17, textAlign: 'right', lineHeight: 28,
  },
  questionPoints: { fontFamily: 'Tajawal_500Medium', fontSize: 12, textAlign: 'right' },

  optionsList: { gap: 10 },
  optionBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 12, padding: 14,
  },
  optionSelected: { borderColor: '#D4A843', backgroundColor: '#D4A84315' },
  optionCorrect:  { borderColor: '#22c55e', backgroundColor: '#22c55e15' },
  optionWrong:    { borderColor: '#ef4444', backgroundColor: '#ef444415' },
  optionLetter: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  optionText: {
    flex: 1, fontFamily: 'Tajawal_500Medium', fontSize: 15, textAlign: 'right',
  },

  tfRow:  { flexDirection: 'row-reverse', gap: 14 },
  tfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 20,
  },

  fillWrap: { gap: 6 },
  fillInput: {
    borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 80,
    textAlignVertical: 'top',
  },

  explanationBox: {
    borderWidth: 1, borderRadius: 12, padding: 14, gap: 4,
  },

  quizBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 14,
  },
  quizBtnPrimary: { backgroundColor: '#101D36' },
  quizBtnText:    { fontFamily: 'Tajawal_700Bold', fontSize: 15 },

  // Results
  resultCard: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  resultEmoji: { fontSize: 52, marginBottom: 4 },
  resultTitle: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 24 },
  resultScore: { fontFamily: 'Tajawal_900Black', fontSize: 42, lineHeight: 50 },
  resultPct:   { fontFamily: 'Tajawal_500Medium', fontSize: 16, marginBottom: 8 },
  resultBreakdown: { width: '100%', gap: 8, marginVertical: 12 },
  resultRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
  },
  resultRowText: {
    flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 13, textAlign: 'right',
  },

  // Lesson title
  titleRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 4, borderBottomWidth: 1,
  },
  lessonTitle: { textAlign: 'right' },
  courseSubtitle: { textAlign: 'right' },

  // Feedback modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, gap: 8,
  },
  modalTitle: { textAlign: 'right', marginBottom: 4 },
  feedbackInput: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    minHeight: 90, marginBottom: 4,
  },
  modalBtns: {
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  modalBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center',
  },

  // Action bar
  actionBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 4,
  },
  actionLabel: { textAlign: 'center' },
  actionDivider: { width: 1, height: 36 },

  // Steps section
  sectionHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  sectionTitle: {},

  // Step row
  stepRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderWidth: 0,
    borderRightWidth: 3, borderRightColor: 'transparent',
  },
  stepNum: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },
  stepTitle: { textAlign: 'right' },
  typePill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  stepIcon: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
