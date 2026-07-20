/**
 * Quiz / Exam page — standalone page for MCQ, True/False, Fill-blank lessons
 * Route: /lesson/quiz/[id]?courseId=<courseId>
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { useGetCourse } from '@workspace/api-client-react';

const API_BASE = (() => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : '/api';
})();

const TYPE_AR: Record<string, string> = {
  mcq: 'اختيار متعدد', true_false: 'صح / خطأ',
  fill_blank: 'ملء الفراغات', qa: 'أسئلة', quiz: 'اختبار', assignment: 'واجب',
};
const TYPE_COLOR: Record<string, string> = {
  mcq: '#06b6d4', true_false: '#22c55e', fill_blank: '#a855f7',
  qa: '#f97316', quiz: '#ec4899', assignment: '#64748b',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function QuizScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const lessonId = Number(id);
  const cId = Number(courseId);

  const router  = useRouter();
  const colors  = useColors();
  const { fontScale } = useApp();
  const fs      = fontScale;

  const { data: course } = useGetCourse(cId);
  const lessons: any[] = course?.lessons ?? [];
  const lesson = lessons.find((l: any) => l.id === lessonId);

  // ── Quiz state ───────────────────────────────────────────────────────────────
  const [questions, setQuestions]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [currentQ, setCurrentQ]     = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed]     = useState(false);
  const [fillInput, setFillInput]   = useState('');
  const [done, setDone]             = useState(false);

  // ── Fetch questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/lessons/${lessonId}/quizzes`);
        if (r.ok) setQuestions(await r.json());
      } catch {}
      setLoading(false);
    })();
  }, [lessonId]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalQ = questions.length;
  const q      = questions[currentQ];
  const chosen = q ? userAnswers[q.id] : undefined;
  const isCorrect =
    chosen !== undefined &&
    q?.correctAnswer &&
    chosen.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

  const score = questions.reduce((acc, qq) => {
    const ans = userAnswers[qq.id];
    if (
      ans && qq.correctAnswer &&
      ans.trim().toLowerCase() === qq.correctAnswer.trim().toLowerCase()
    ) return acc + (qq.points ?? 1);
    return acc;
  }, 0);
  const maxScore = questions.reduce((acc, qq) => acc + (qq.points ?? 1), 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────
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
      setDone(true);
    }
  }, [currentQ, totalQ]);

  const resetQuiz = useCallback(() => {
    setCurrentQ(0);
    setUserAnswers({});
    setRevealed(false);
    setFillInput('');
    setDone(false);
  }, []);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/course/[id]' as any, params: { id: cId } });
  };

  // ── Type label & color ────────────────────────────────────────────────────────
  const typeLabel = TYPE_AR[lesson?.type ?? ''] ?? 'اختبار';
  const typeColor = TYPE_COLOR[lesson?.type ?? ''] ?? '#06b6d4';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[S.screen, { backgroundColor: colors.background }]}>

      {/* ── Header (unified PageHeader like all other pages) ── */}
      <PageHeader
        title={lesson?.title ?? 'الاختبار'}
        onBack={goBack}
        backgroundColor="#101D36"
        tintColor="#fff"
        borderColor="rgba(255,255,255,0.1)"
        right={
          <View style={[S.typePill, { backgroundColor: typeColor + '30', borderColor: typeColor + '60' }]}>
            <Text style={[S.typePillText, { color: typeColor, fontSize: 11 * fs }]}>{typeLabel}</Text>
          </View>
        }
      />

      {/* ── Body ── */}
      <ScrollView
        contentContainerStyle={[S.body, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={S.center}>
            <ActivityIndicator size="large" color="#D4A843" />
            <Text style={[S.emptyText, { color: colors.mutedForeground, fontSize: 14 * fs }]}>
              جاري التحميل...
            </Text>
          </View>
        ) : totalQ === 0 ? (
          <View style={S.center}>
            <Ionicons name="help-circle-outline" size={64} color="rgba(212,168,67,0.35)" />
            <Text style={[S.emptyText, { color: colors.mutedForeground, fontSize: 16 * fs }]}>
              لا توجد أسئلة بعد
            </Text>
            <Text style={[S.emptySubText, { color: colors.mutedForeground, fontSize: 13 * fs }]}>
              سيضيف المدرس الأسئلة قريباً
            </Text>
          </View>
        ) : done ? (
          <ResultsView
            score={score}
            maxScore={maxScore}
            questions={questions}
            userAnswers={userAnswers}
            colors={colors}
            fs={fs}
            onRetry={resetQuiz}
            onBack={goBack}
          />
        ) : (
          <QuestionView
            q={q}
            qIndex={currentQ}
            totalQ={totalQ}
            chosen={chosen}
            revealed={revealed}
            isCorrect={isCorrect}
            fillInput={fillInput}
            setFillInput={setFillInput}
            onAnswer={handleAnswer}
            onNext={handleNext}
            colors={colors}
            fs={fs}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Question View ────────────────────────────────────────────────────────────
function QuestionView({
  q, qIndex, totalQ, chosen, revealed, isCorrect,
  fillInput, setFillInput, onAnswer, onNext, colors, fs,
}: any) {
  const isMCQ  = q.type === 'multiple_choice';
  const isTF   = q.type === 'true_false';
  const isFill = q.type === 'fill_blank' || q.type === 'short_answer';

  return (
    <View style={S.qWrap}>
      {/* Progress */}
      <View style={S.progressRow}>
        <View style={S.progressTrack}>
          <View style={[S.progressFill, { width: `${(qIndex / totalQ) * 100}%` as any }]} />
        </View>
        <Text style={[S.progressLabel, { color: colors.mutedForeground, fontSize: 12 * fs }]}>
          {qIndex + 1} / {totalQ}
        </Text>
      </View>

      {/* Question card */}
      <View style={[S.qCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[S.qNumber, { color: '#D4A843', fontSize: 12 * fs }]}>
          السؤال {qIndex + 1}
          {q.points > 1 ? `  ·  ${q.points} نقاط` : ''}
        </Text>
        <Text style={[S.qText, { color: colors.foreground, fontSize: 17 * fs }]}>
          {q.question}
        </Text>
      </View>

      {/* MCQ options */}
      {isMCQ && (q.options ?? []).length > 0 && (
        <View style={S.optionsList}>
          {(q.options as string[]).map((opt: string, i: number) => {
            const isChosen  = chosen === opt;
            const isCorrectOpt = revealed && q.correctAnswer === opt;
            const isWrong   = revealed && isChosen && !isCorrectOpt;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => onAnswer(opt)}
                disabled={revealed}
                activeOpacity={0.72}
                style={[
                  S.optBtn,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  isChosen && !revealed && S.optSelected,
                  isCorrectOpt && S.optCorrect,
                  isWrong && S.optWrong,
                ]}
              >
                <View style={[S.optLetter, { backgroundColor: '#101D3620' }]}>
                  <Text style={[S.optLetterText, { color: '#101D36', fontSize: 13 * fs }]}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={[S.optText, { color: colors.foreground, fontSize: 15 * fs }]}>
                  {opt}
                </Text>
                {isCorrectOpt && <Ionicons name="checkmark-circle" size={22} color="#22c55e" />}
                {isWrong      && <Ionicons name="close-circle"     size={22} color="#ef4444" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* True / False */}
      {isTF && (
        <View style={S.tfRow}>
          {[{ val: 'صح', emoji: '✅' }, { val: 'خطأ', emoji: '❌' }].map(({ val, emoji }) => {
            const isChosen     = chosen === val;
            const isCorrectOpt = revealed && q.correctAnswer === val;
            const isWrong      = revealed && isChosen && !isCorrectOpt;
            return (
              <TouchableOpacity
                key={val}
                onPress={() => onAnswer(val)}
                disabled={revealed}
                activeOpacity={0.72}
                style={[
                  S.tfBtn,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  isChosen && !revealed && S.optSelected,
                  isCorrectOpt && S.optCorrect,
                  isWrong      && S.optWrong,
                ]}
              >
                <Text style={{ fontSize: 30 }}>{emoji}</Text>
                <Text style={[S.tfLabel, { color: colors.foreground, fontSize: 17 * fs }]}>{val}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Fill blank */}
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
              backgroundColor: colors.background,
              fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs,
            }]}
            textAlign="right"
            multiline
          />
          {!revealed && (
            <TouchableOpacity
              onPress={() => fillInput.trim() && onAnswer(fillInput.trim())}
              disabled={!fillInput.trim()}
              style={[S.primaryBtn, !fillInput.trim() && { opacity: 0.4 }]}
            >
              <Text style={[S.primaryBtnText, { fontSize: 15 * fs }]}>تأكيد الإجابة</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Explanation after reveal */}
      {revealed && (
        <View style={[S.explanationBox, {
          backgroundColor: isCorrect ? '#22c55e18' : '#ef444418',
          borderColor:     isCorrect ? '#22c55e60' : '#ef444460',
        }]}>
          <View style={S.explanationHeader}>
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={isCorrect ? '#22c55e' : '#ef4444'}
            />
            <Text style={[S.explanationResult, {
              color: isCorrect ? '#22c55e' : '#ef4444', fontSize: 15 * fs,
            }]}>
              {isCorrect ? 'إجابة صحيحة! 🎉' : `خطأ — الصحيح: ${q.correctAnswer}`}
            </Text>
          </View>
          {!!q.explanation && (
            <Text style={[S.explanationText, { color: colors.mutedForeground, fontSize: 13 * fs }]}>
              {q.explanation}
            </Text>
          )}
        </View>
      )}

      {/* Next button */}
      {revealed && (
        <TouchableOpacity onPress={onNext} style={S.primaryBtn}>
          <Text style={[S.primaryBtnText, { fontSize: 15 * fs }]}>
            {qIndex < totalQ - 1 ? 'السؤال التالي' : 'إنهاء الاختبار'}
          </Text>
          <Ionicons
            name={qIndex < totalQ - 1 ? 'arrow-back' : 'flag-outline'}
            size={18} color="#fff"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Results View ──────────────────────────────────────────────────────────────
function ResultsView({ score, maxScore, questions, userAnswers, colors, fs, onRetry, onBack }: any) {
  const pct    = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = pct >= 60;

  return (
    <View style={S.resultsWrap}>
      {/* Score circle */}
      <View style={[S.scoreCircle, { borderColor: passed ? '#22c55e' : '#ef4444' }]}>
        <Text style={[S.scoreEmoji]}>{passed ? '🏆' : '💪'}</Text>
        <Text style={[S.scorePct, { color: passed ? '#22c55e' : '#ef4444', fontSize: 38 * fs }]}>
          {pct}%
        </Text>
        <Text style={[S.scoreLabel, { color: colors.mutedForeground, fontSize: 13 * fs }]}>
          {score} / {maxScore} نقطة
        </Text>
      </View>

      <Text style={[S.resultTitle, { color: colors.foreground, fontSize: 22 * fs }]}>
        {passed ? 'أحسنت! اجتزت الاختبار' : 'لم تجتز الاختبار — حاول مجدداً'}
      </Text>

      {/* Question breakdown */}
      <View style={[S.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[S.breakdownTitle, { color: colors.foreground, fontSize: 14 * fs }]}>
          ملخص الإجابات
        </Text>
        {questions.map((qq: any, i: number) => {
          const ans = userAnswers[qq.id];
          const ok  = ans && qq.correctAnswer &&
            ans.trim().toLowerCase() === qq.correctAnswer.trim().toLowerCase();
          return (
            <View key={qq.id} style={[S.breakdownRow, { borderTopColor: colors.border }]}>
              <View style={S.breakdownLeft}>
                <Ionicons
                  name={ok ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={ok ? '#22c55e' : '#ef4444'}
                />
                <Text style={[S.breakdownPts, { color: ok ? '#22c55e' : '#ef4444', fontSize: 12 * fs }]}>
                  {ok ? `+${qq.points ?? 1}` : '0'}
                </Text>
              </View>
              <View style={S.breakdownRight}>
                <Text style={[S.breakdownQ, { color: colors.foreground, fontSize: 13 * fs }]} numberOfLines={2}>
                  {i + 1}. {qq.question}
                </Text>
                {!ok && ans && (
                  <Text style={[S.breakdownAns, { color: '#ef4444', fontSize: 12 * fs }]}>
                    إجابتك: {ans}
                  </Text>
                )}
                {!ok && qq.correctAnswer && (
                  <Text style={[S.breakdownCorrect, { color: '#22c55e', fontSize: 12 * fs }]}>
                    الصحيح: {qq.correctAnswer}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={S.resultActions}>
        <TouchableOpacity onPress={onRetry} style={[S.secondaryBtn, { borderColor: '#101D36' }]}>
          <Ionicons name="refresh" size={18} color="#101D36" />
          <Text style={[S.secondaryBtnText, { fontSize: 15 * fs }]}>إعادة الاختبار</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={S.primaryBtn}>
          <Ionicons name="book-outline" size={18} color="#fff" />
          <Text style={[S.primaryBtnText, { fontSize: 15 * fs }]}>العودة للكورس</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  typePillText: { fontFamily: 'Tajawal_700Bold' },

  body: { padding: 16, gap: 16 },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyText:    { fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  emptySubText: { fontFamily: 'Tajawal_400Regular', textAlign: 'center' },

  // Question
  qWrap: { gap: 16 },
  progressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)' },
  progressFill:  { height: '100%', borderRadius: 3, backgroundColor: '#D4A843' },
  progressLabel: { fontFamily: 'Tajawal_700Bold', minWidth: 40, textAlign: 'center' },

  qCard: {
    borderRadius: 16, borderWidth: 1, padding: 20, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  qNumber: { fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  qText:   { fontFamily: 'Tajawal_700Bold', textAlign: 'right', lineHeight: 30 },

  // MCQ
  optionsList: { gap: 10 },
  optBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 14, padding: 14,
  },
  optSelected: { borderColor: '#D4A843', backgroundColor: '#D4A84312' },
  optCorrect:  { borderColor: '#22c55e', backgroundColor: '#22c55e12' },
  optWrong:    { borderColor: '#ef4444', backgroundColor: '#ef444412' },
  optLetter: {
    width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  optLetterText: { fontFamily: 'Tajawal_700Bold' },
  optText:       { flex: 1, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },

  // True/False
  tfRow: { flexDirection: 'row-reverse', gap: 12 },
  tfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 16, paddingVertical: 24,
  },
  tfLabel: { fontFamily: 'Tajawal_700Bold' },

  // Fill blank
  fillWrap: { gap: 10 },
  fillInput: {
    borderWidth: 1.5, borderRadius: 14, padding: 14, minHeight: 90,
    textAlignVertical: 'top',
  },

  // Explanation
  explanationBox: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  explanationHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  explanationResult: { fontFamily: 'Tajawal_700Bold', flex: 1, textAlign: 'right' },
  explanationText:   { fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 22 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#101D36', borderRadius: 14, paddingVertical: 15,
  },
  primaryBtnText: { color: '#fff', fontFamily: 'Tajawal_700Bold' },
  secondaryBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 15, flex: 1,
  },
  secondaryBtnText: { color: '#101D36', fontFamily: 'Tajawal_700Bold' },

  // Results
  resultsWrap: { gap: 20 },
  scoreCircle: {
    alignSelf: 'center', width: 160, height: 160, borderRadius: 80,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  scoreEmoji: { fontSize: 36 },
  scorePct:   { fontFamily: 'Tajawal_900Black', lineHeight: 44 },
  scoreLabel: { fontFamily: 'Tajawal_500Medium', textAlign: 'center' },
  resultTitle: { fontFamily: 'Tajawal_700Bold', textAlign: 'center', lineHeight: 32 },

  breakdownCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  breakdownTitle: {
    fontFamily: 'Tajawal_700Bold', textAlign: 'right',
    padding: 14, paddingBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10,
    borderTopWidth: 1, padding: 12,
  },
  breakdownLeft:  { alignItems: 'center', gap: 2, paddingTop: 2 },
  breakdownRight: { flex: 1, gap: 2 },
  breakdownPts:   { fontFamily: 'Tajawal_700Bold' },
  breakdownQ:     { fontFamily: 'Tajawal_500Medium', textAlign: 'right', lineHeight: 20 },
  breakdownAns:   { fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  breakdownCorrect: { fontFamily: 'Tajawal_400Regular', textAlign: 'right' },

  resultActions: { flexDirection: 'row-reverse', gap: 12 },
});
