/**
 * AddLessonModal — 3-tab lesson creator (fully RTL)
 * Tabs: الكل | امتحانات | الرفع
 */
import React, { useState, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { RichTextEditor } from './RichTextEditor';
import { useCreateLesson, getGetCourseQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';

// ─── Type registry ──────────────────────────────────────────────────────────────
type LessonCategory = 'all' | 'exams' | 'upload';

interface LessonTypeDef {
  value: string;
  label: string;
  subLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  categories: LessonCategory[];
}

const LESSON_TYPES: LessonTypeDef[] = [
  // Upload
  { value: 'video',       label: 'فيديو',              subLabel: 'رابط أو ملف',       icon: 'play-circle',         color: '#3b82f6', categories: ['all','upload'] },
  { value: 'pdf',         label: 'PDF',                 subLabel: 'وثيقة PDF',         icon: 'document',            color: '#ef4444', categories: ['all','upload'] },
  { value: 'richtext',    label: 'نص منسّق',            subLabel: 'محرر متقدم',        icon: 'create',              color: '#8b5cf6', categories: ['all','upload'] },
  { value: 'link',        label: 'رابط ويب',            subLabel: 'يفتح بالتطبيق',     icon: 'earth',               color: '#10b981', categories: ['all','upload'] },
  { value: 'livestream',  label: 'بث مباشر',            subLabel: 'إشعار فوري',        icon: 'radio',               color: '#f59e0b', categories: ['all','upload'] },
  // Exams
  { value: 'mcq',         label: 'اختيار من متعدد',     subLabel: 'MCQ',               icon: 'radio-button-on',     color: '#06b6d4', categories: ['all','exams'] },
  { value: 'true_false',  label: 'صح وخطأ',             subLabel: 'True / False',      icon: 'checkmark-circle',    color: '#22c55e', categories: ['all','exams'] },
  { value: 'fill_blank',  label: 'ملء الفراغات',        subLabel: 'Fill in the blank', icon: 'pencil',              color: '#a855f7', categories: ['all','exams'] },
  { value: 'qa',          label: 'أسئلة وأجوبة',        subLabel: 'Q & A',             icon: 'help-circle',         color: '#f97316', categories: ['all','exams'] },
  { value: 'quiz',        label: 'اختبار',              subLabel: 'Quiz',              icon: 'school',              color: '#ec4899', categories: ['all','exams'] },
  { value: 'assignment',  label: 'واجب',                subLabel: 'Assignment',        icon: 'clipboard',           color: '#64748b', categories: ['all','exams'] },
];

const TABS: { key: LessonCategory; label: string }[] = [
  { key: 'all',    label: 'الكل' },
  { key: 'exams',  label: 'امتحانات' },
  { key: 'upload', label: 'الرفع' },
];

// ─── MCQ ────────────────────────────────────────────────────────────────────────
interface McqOption { text: string; isCorrect: boolean }
interface McqQuestion { question: string; options: McqOption[]; points: number }
const defaultMcqOptions = (): McqOption[] => [
  { text: '', isCorrect: false }, { text: '', isCorrect: false },
  { text: '', isCorrect: false }, { text: '', isCorrect: false },
];
const defaultMcqQuestion = (): McqQuestion => ({ question: '', options: defaultMcqOptions(), points: 5 });

// ─── True/False ─────────────────────────────────────────────────────────────────
interface TFQuestion { statement: string; correct: boolean | null }
const defaultTFQuestion = (): TFQuestion => ({ statement: '', correct: null });

// ─── Fill blank ─────────────────────────────────────────────────────────────────
interface FbQuestion { text: string; answers: string[] }
const defaultFbQuestion = (): FbQuestion => ({ text: '', answers: [] });

// ─── Q&A (teacher writes question; student answers) ─────────────────────────────
interface QAQuestion { question: string }

// ─── Quiz item (any question type inside a quiz) ────────────────────────────────
type QuizItemType = 'mcq' | 'true_false' | 'fill_blank' | 'qa'
interface QuizItem {
  id: string; // local key
  type: QuizItemType;
  // mcq
  mcqQuestion?: string;
  mcqOptions?: McqOption[];
  mcqPoints?: number;
  // true_false
  tfStatement?: string;
  tfCorrect?: boolean | null;
  tfPoints?: number;
  // fill_blank
  fbText?: string;
  fbAnswers?: string[];
  // qa
  qaQuestion?: string;
}
const newQuizItem = (type: QuizItemType): QuizItem => ({
  id: Math.random().toString(36).slice(2),
  type,
  mcqQuestion: '', mcqOptions: defaultMcqOptions(), mcqPoints: 5,
  tfStatement: '', tfCorrect: null, tfPoints: 2,
  fbText: '', fbAnswers: [],
  qaQuestion: '',
});

// ─── Field label ────────────────────────────────────────────────────────────────
function FLabel({ text, fs, colors }: { text: string; fs: number; colors: any }) {
  return (
    <Text style={[S.flabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
      {text}
    </Text>
  );
}

// ─── RTL text input ─────────────────────────────────────────────────────────────
function RInput({
  value, onChange, placeholder, multiline = false, keyboardType = 'default',
  style, colors, fs,
}: {
  value: string; onChange: (t: string) => void; placeholder?: string;
  multiline?: boolean; keyboardType?: any; style?: any; colors: any; fs: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      multiline={multiline}
      keyboardType={keyboardType}
      style={[
        S.input, { backgroundColor: colors.card, borderColor: colors.border,
          color: colors.foreground, fontFamily: 'Tajawal_400Regular',
          fontSize: 14 * fs, minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center' }, style,
      ]}
      textAlign="right"
    />
  );
}

// ─── Note box ───────────────────────────────────────────────────────────────────
function NoteBox({ text, icon, colors, fs }: { text: string; icon: any; colors: any; fs: number }) {
  return (
    <View style={[S.note, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, flex: 1, textAlign: 'right', lineHeight: 20 }]}>
        {text}
      </Text>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  courseId: number;
  teacherId: number;
  lessonsCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddLessonModal({ visible, courseId, teacherId, lessonsCount, onClose, onSuccess }: Props) {
  const colors = useColors();
  const { fontScale } = useApp();
  const fs = fontScale;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const createLesson = useCreateLesson();

  // ── Navigation state
  const [activeTab, setActiveTab] = useState<LessonCategory>('all');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // ── Common fields
  const [title, setTitle] = useState('');

  // ── Chunked video upload
  const { upload: uploadVideo, cancel: cancelUpload, reset: resetUpload,
          progress: uploadProgress, isUploading, error: uploadError } = useChunkedUpload();

  // ── Video
  const [videoSource, setVideoSource] = useState<'url' | 'file'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [videoFileSize, setVideoFileSize] = useState<number>(0);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const [durationMin, setDurationMin] = useState('');

  // ── PDF
  const [pdfSource, setPdfSource] = useState<'url' | 'file'>('url');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<string | null>(null);

  // ── Rich text
  const [richHtml, setRichHtml] = useState('');

  // ── Link
  const [linkUrl, setLinkUrl] = useState('');

  // ── Livestream
  const [streamUrl, setStreamUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [creatingLivestream, setCreatingLivestream] = useState(false);

  // ── MCQ (multi-question)
  const [mcqQuestions, setMcqQuestions] = useState<McqQuestion[]>([defaultMcqQuestion()]);

  // ── True/False (multi-question)
  const [tfQuestions, setTfQuestions] = useState<TFQuestion[]>([defaultTFQuestion()]);
  const [tfPoints, setTfPoints] = useState('2');

  // ── Fill blank (multi-question)
  const [fbQuestions, setFbQuestions] = useState<FbQuestion[]>([defaultFbQuestion()]);

  // ── Q&A (teacher writes question only; student answers)
  const [qaQuestions, setQaQuestions] = useState<QAQuestion[]>([{ question: '' }]);

  // ── Quiz builder
  const [quizTimeLimit, setQuizTimeLimit] = useState('30');
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [showQuizTypePicker, setShowQuizTypePicker] = useState(false);

  // ── Assignment
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignPoints, setAssignPoints] = useState('10');

  // ────────────────────────────────────────────────────────────────────────────
  const reset = () => {
    setActiveTab('all'); setSelectedType(null); setTitle('');
    setVideoSource('url'); setVideoUrl(''); setVideoFile(null);
    setVideoFileSize(0); setUploadedVideoUrl(''); resetUpload();
    setDurationMin('');
    setPdfSource('url'); setPdfUrl(''); setPdfFile(null);
    setRichHtml(''); setLinkUrl(''); setStreamUrl('');
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); setScheduledDate(d);
    setShowDatePicker(false); setShowTimePicker(false);
    setMcqQuestions([defaultMcqQuestion()]);
    setTfQuestions([defaultTFQuestion()]); setTfPoints('2');
    setFbQuestions([defaultFbQuestion()]);
    setQaQuestions([{ question: '' }]);
    setQuizTimeLimit('30'); setQuizItems([]); setShowQuizTypePicker(false);
    setAssignInstructions(''); setAssignPoints('10');
  };

  const handleClose = () => { reset(); onClose(); };

  // ── File picker + auto-upload ─────────────────────────────────────────────
  const pickVideoFile = async () => {
    if (isUploading) return; // لا تفتح المنتقي أثناء الرفع
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/*', 'video/mp4', 'video/x-m4v'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setVideoFile(asset.name);
      setVideoFileSize(asset.size ?? 0);
      setUploadedVideoUrl(''); // أعد التعيين عند اختيار ملف جديد
      // ابدأ الرفع تلقائياً
      try {
        const url = await uploadVideo(asset.uri, asset.size ?? 0, asset.name);
        setUploadedVideoUrl(url);
      } catch {
        // الخطأ موجود في uploadError
      }
    }
  };

  const pickPdfFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPdfFile(result.assets[0].name);
      setPdfUrl(result.assets[0].uri);
    }
  };

  // ── MCQ helpers (multi-question) ─────────────────────────────────────────
  const updateMcqQuestion = (qi: number, field: Partial<McqQuestion>) =>
    setMcqQuestions(prev => prev.map((q, i) => i === qi ? { ...q, ...field } : q));
  const setMcqCorrect = (qi: number, oi: number) =>
    updateMcqQuestion(qi, { options: mcqQuestions[qi].options.map((o, i) => ({ ...o, isCorrect: i === oi })) });
  const setMcqOptionText = (qi: number, oi: number, t: string) =>
    updateMcqQuestion(qi, { options: mcqQuestions[qi].options.map((o, i) => i === oi ? { ...o, text: t } : o) });

  // ── Fill blank helpers (multi-question) ───────────────────────────────────
  const onFbTextChange = (qi: number, t: string) => {
    const blanks = (t.match(/___/g) || []).length;
    setFbQuestions(prev => prev.map((q, i) => {
      if (i !== qi) return q;
      const arr = [...q.answers];
      while (arr.length < blanks) arr.push('');
      return { text: t, answers: arr.slice(0, blanks) };
    }));
  };
  const setFbAnswer = (qi: number, ai: number, val: string) =>
    setFbQuestions(prev => prev.map((q, i) => i === qi
      ? { ...q, answers: q.answers.map((a, j) => j === ai ? val : a) }
      : q));

  // ── Quiz item helpers ─────────────────────────────────────────────────────
  const updateQuizItem = (id: string, patch: Partial<QuizItem>) =>
    setQuizItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  const quizItemFbTextChange = (id: string, t: string) => {
    const blanks = (t.match(/___/g) || []).length;
    setQuizItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const arr = [...(it.fbAnswers ?? [])];
      while (arr.length < blanks) arr.push('');
      return { ...it, fbText: t, fbAnswers: arr.slice(0, blanks) };
    }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('خطأ', 'عنوان المحاضرة مطلوب'); return; }
    if (!selectedType) { Alert.alert('خطأ', 'اختر نوع المحاضرة'); return; }

    // ── Livestream: create livestream record first, then lesson ──────────────
    if (selectedType === 'livestream') {
      if (scheduledDate < new Date()) { Alert.alert('خطأ', 'يرجى اختيار وقت في المستقبل'); return; }
      setCreatingLivestream(true);
      try {
        const domain = process.env.EXPO_PUBLIC_DOMAIN;
        const base = domain ? `https://${domain}` : '';
        const r = await fetch(`${base}/api/mobile/teacher/livestreams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId, courseId,
            title: title.trim(),
            scheduledAt: scheduledDate.toISOString(),
          }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'فشل الإنشاء');
        const ls = await r.json();
        createLesson.mutate({
          courseId,
          data: {
            title: title.trim(),
            type: 'livestream' as any,
            contentText: JSON.stringify({ livestreamId: ls.id }),
            order: lessonsCount + 1,
            isPublished: true,
            teacherId,
          } as any,
        }, {
          onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) }); reset(); onSuccess(); onClose(); },
          onError: () => Alert.alert('خطأ', 'تم إنشاء البث لكن فشل حفظ المحاضرة'),
        });
      } catch (e: any) {
        Alert.alert('خطأ', e.message);
      } finally {
        setCreatingLivestream(false);
      }
      return;
    }

    let contentUrl: string | undefined;
    let contentText: string | undefined;
    let duration: number | undefined;
    const order = lessonsCount + 1;

    switch (selectedType) {
      case 'video':
        if (videoSource === 'file') {
          if (isUploading) { Alert.alert('تنبيه', 'انتظر حتى ينتهي رفع الفيديو'); return; }
          if (!uploadedVideoUrl) { Alert.alert('خطأ', 'اختر ملف فيديو وانتظر اكتمال الرفع'); return; }
          contentUrl = uploadedVideoUrl;
        } else {
          contentUrl = videoUrl.trim() || undefined;
        }
        duration = durationMin ? Math.round(parseFloat(durationMin) * 60) : undefined;
        break;
      case 'pdf':
        contentUrl = pdfUrl.trim() || undefined;
        break;
      case 'richtext':
        contentText = richHtml || undefined;
        break;
      case 'link':
        if (!linkUrl.trim()) { Alert.alert('خطأ', 'الرابط مطلوب'); return; }
        contentUrl = linkUrl.trim();
        break;
      case 'mcq': {
        const invalid = mcqQuestions.findIndex(q => !q.question.trim() || !q.options.some(o => o.isCorrect));
        if (invalid !== -1) { Alert.alert('خطأ', `السؤال ${invalid + 1}: اكتب السؤال وحدد الإجابة الصحيحة`); return; }
        contentText = JSON.stringify({ questions: mcqQuestions });
        break;
      }
      case 'true_false': {
        const unanswered = tfQuestions.findIndex(q => !q.statement.trim() || q.correct === null);
        if (unanswered !== -1) {
          Alert.alert('خطأ', `السؤال ${unanswered + 1}: اكتب العبارة وحدد الإجابة الصحيحة`);
          return;
        }
        contentText = JSON.stringify({ questions: tfQuestions, pointsPerQuestion: Number(tfPoints) });
        break;
      }
      case 'fill_blank': {
        const inv = fbQuestions.findIndex(q => !q.text.trim());
        if (inv !== -1) { Alert.alert('خطأ', `السؤال ${inv + 1}: النص مطلوب`); return; }
        contentText = JSON.stringify({ questions: fbQuestions });
        break;
      }
      case 'qa':
        if (qaQuestions.every(q => !q.question.trim())) { Alert.alert('خطأ', 'أدخل سؤالاً واحداً على الأقل'); return; }
        contentText = JSON.stringify({ questions: qaQuestions.filter(q => q.question.trim()) });
        break;
      case 'quiz':
        if (quizItems.length === 0) { Alert.alert('خطأ', 'أضف سؤالاً واحداً على الأقل للاختبار'); return; }
        contentText = JSON.stringify({ timeLimit: Number(quizTimeLimit), items: quizItems });
        break;
      case 'assignment':
        contentText = JSON.stringify({ instructions: assignInstructions, points: Number(assignPoints) });
        break;
    }

    createLesson.mutate({
      courseId,
      data: {
        title: title.trim(),
        type: selectedType as any,
        contentUrl,
        contentText,
        duration,
        order,
        isPublished: true,
        teacherId,
      } as any,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
        reset(); onSuccess(); onClose();
      },
      onError: () => Alert.alert('خطأ', 'فشل حفظ المحاضرة، حاول مرة أخرى'),
    });
  };

  // ── Type definition lookup
  const typeDef = selectedType ? LESSON_TYPES.find(t => t.value === selectedType) : null;
  const filteredTypes = LESSON_TYPES.filter(t => t.categories.includes(activeTab));

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[S.container, { backgroundColor: colors.background }]}>

          {/* ── Header ─────────────────────────────────────────── */}
          <View style={[S.header, { borderBottomColor: colors.border }]}>
            {/* Left: cancel */}
            <TouchableOpacity onPress={handleClose} style={S.headerSide}>
              <Text style={[S.cancelText, { color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
                إلغاء
              </Text>
            </TouchableOpacity>

            {/* Center: title */}
            <Text style={[S.headerTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
              إضافة محاضرة
            </Text>

            {/* Right: submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={createLesson.isPending || creatingLivestream || isUploading}
              style={[S.headerSide, S.addBtn, { backgroundColor: colors.primary, opacity: (createLesson.isPending || creatingLivestream || isUploading) ? 0.6 : 1 }]}
            >
              <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                {isUploading ? `${uploadProgress}%` : (createLesson.isPending || creatingLivestream) ? '...' : 'إضافة'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 + insets.bottom, gap: 0 }}
          >
            {/* ── Title input ─────────────────────────────────── */}
            <View style={[S.section, { borderBottomColor: colors.border }]}>
              <FLabel text="عنوان المحاضرة *" fs={fs} colors={colors} />
              <RInput
                value={title} onChange={setTitle}
                placeholder="مثال: مقدمة التكامل"
                colors={colors} fs={fs}
              />
            </View>

            {/* ── Category tabs ───────────────────────────────── */}
            <View style={[S.tabsRow, { borderBottomColor: colors.border }]}>
              {TABS.map(tab => {
                const active = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => { setActiveTab(tab.key); setSelectedType(null); }}
                    style={[S.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
                  >
                    <Text style={[S.tabText, {
                      color: active ? colors.primary : colors.mutedForeground,
                      fontFamily: active ? 'Tajawal_700Bold' : 'Tajawal_400Regular',
                      fontSize: 15 * fs,
                    }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Type grid ────────────────────────────────────── */}
            <View style={S.typeGrid}>
              {filteredTypes.map(t => {
                const sel = selectedType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setSelectedType(sel ? null : t.value)}
                    style={[S.typeCard, {
                      backgroundColor: sel ? t.color + '22' : colors.card,
                      borderColor: sel ? t.color : colors.border,
                    }]}
                  >
                    <View style={[S.typeIcon, { backgroundColor: t.color + '22' }]}>
                      <Ionicons name={t.icon} size={22} color={t.color} />
                    </View>
                    <Text style={[S.typeLabel, { color: sel ? t.color : colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                      {t.label}
                    </Text>
                    <Text style={[S.typeSubLabel, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 10 * fs }]}>
                      {t.subLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Type-specific form ────────────────────────────── */}
            {selectedType && (
              <View style={[S.form, { borderTopColor: colors.border }]}>
                {/* Selected type badge */}
                {typeDef && (
                  <View style={[S.typeBadge, { backgroundColor: typeDef.color + '18', borderColor: typeDef.color + '40' }]}>
                    <Ionicons name={typeDef.icon} size={16} color={typeDef.color} />
                    <Text style={[{ color: typeDef.color, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                      {typeDef.label}
                    </Text>
                  </View>
                )}

                {/* ─ Video form ─ */}
                {selectedType === 'video' && (
                  <View style={S.formGroup}>
                    {/* Source toggle */}
                    <FLabel text="مصدر الفيديو" fs={fs} colors={colors} />
                    <View style={[S.sourceToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      {(['url', 'file'] as const).map(src => (
                        <TouchableOpacity
                          key={src}
                          onPress={() => setVideoSource(src)}
                          style={[S.sourceBtn, videoSource === src && { backgroundColor: colors.primary }]}
                        >
                          <Ionicons
                            name={src === 'url' ? 'link-outline' : 'folder-outline'}
                            size={14}
                            color={videoSource === src ? '#fff' : colors.mutedForeground}
                          />
                          <Text style={[{ color: videoSource === src ? '#fff' : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
                            {src === 'url' ? 'رابط مباشر' : 'ملف من الجهاز'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {videoSource === 'url' ? (
                      <>
                        <FLabel text="رابط الفيديو (YouTube / mp4 / m3u8) *" fs={fs} colors={colors} />
                        <RInput value={videoUrl} onChange={setVideoUrl} placeholder="https://..." colors={colors} fs={fs} />
                        <Text style={[S.hint, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                          يدعم: YouTube، Vimeo، روابط mp4 و m3u8 المباشرة
                        </Text>
                      </>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {/* زر الاختيار */}
                        <TouchableOpacity
                          onPress={pickVideoFile}
                          disabled={isUploading}
                          style={[S.filePicker, {
                            backgroundColor: colors.card,
                            borderColor: uploadedVideoUrl ? '#22c55e' : isUploading ? colors.primary : colors.border,
                            opacity: isUploading ? 0.7 : 1,
                          }]}
                        >
                          <Ionicons
                            name={uploadedVideoUrl ? 'checkmark-circle' : isUploading ? 'cloud-upload' : 'cloud-upload-outline'}
                            size={28}
                            color={uploadedVideoUrl ? '#22c55e' : colors.primary}
                          />
                          <Text style={[{ color: uploadedVideoUrl ? '#22c55e' : colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                            {uploadedVideoUrl
                              ? 'تم الرفع بنجاح ✓'
                              : isUploading
                              ? 'جاري الرفع...'
                              : videoFile ?? 'اختر ملف فيديو'}
                          </Text>
                          {!isUploading && !uploadedVideoUrl && (
                            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                              mp4، m4v، mov وصيغ أخرى
                            </Text>
                          )}
                          {videoFile && !uploadedVideoUrl && !isUploading && (
                            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 10 * fs }]}>
                              {videoFile}
                            </Text>
                          )}
                        </TouchableOpacity>

                        {/* شريط التقدم — يظهر أثناء الرفع أو بعده */}
                        {(isUploading || uploadedVideoUrl) && (
                          <View style={{ gap: 6 }}>
                            {/* النسبة والحجم */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[{ color: uploadedVideoUrl ? '#22c55e' : colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                                {uploadedVideoUrl ? 'مكتمل' : `${uploadProgress}%`}
                              </Text>
                              {videoFileSize > 0 && (
                                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                                  {(videoFileSize / (1024 * 1024)).toFixed(1)} MB
                                </Text>
                              )}
                            </View>

                            {/* الشريط */}
                            <View style={[S.progressTrack, { backgroundColor: colors.muted }]}>
                              <View style={[S.progressFill, {
                                width: `${uploadedVideoUrl ? 100 : uploadProgress}%` as any,
                                backgroundColor: uploadedVideoUrl ? '#22c55e' : colors.primary,
                              }]} />
                            </View>

                            {/* رسالة خطأ */}
                            {uploadError && (
                              <View style={[S.errorBox]}>
                                <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                                <Text style={[{ color: '#ef4444', fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, flex: 1 }]}>
                                  {uploadError}
                                </Text>
                              </View>
                            )}

                            {/* زر الإلغاء */}
                            {isUploading && (
                              <TouchableOpacity
                                onPress={cancelUpload}
                                style={[S.cancelUploadBtn, { borderColor: '#ef4444' }]}
                              >
                                <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                                <Text style={[{ color: '#ef4444', fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
                                  إلغاء الرفع
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    )}

                    <FLabel text="مدة الفيديو (بالدقائق)" fs={fs} colors={colors} />
                    <RInput value={durationMin} onChange={setDurationMin} placeholder="45" keyboardType="numeric" colors={colors} fs={fs} style={{ width: 120, textAlign: 'center' }} />
                  </View>
                )}

                {/* ─ PDF form ─ */}
                {selectedType === 'pdf' && (
                  <View style={S.formGroup}>
                    <FLabel text="مصدر الملف" fs={fs} colors={colors} />
                    <View style={[S.sourceToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      {(['url', 'file'] as const).map(src => (
                        <TouchableOpacity
                          key={src}
                          onPress={() => setPdfSource(src)}
                          style={[S.sourceBtn, pdfSource === src && { backgroundColor: colors.primary }]}
                        >
                          <Ionicons name={src === 'url' ? 'link-outline' : 'folder-outline'} size={14} color={pdfSource === src ? '#fff' : colors.mutedForeground} />
                          <Text style={[{ color: pdfSource === src ? '#fff' : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
                            {src === 'url' ? 'رابط PDF' : 'ملف من الجهاز'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {pdfSource === 'url' ? (
                      <>
                        <FLabel text="رابط PDF *" fs={fs} colors={colors} />
                        <RInput value={pdfUrl} onChange={setPdfUrl} placeholder="https://example.com/doc.pdf" colors={colors} fs={fs} />
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={pickPdfFile}
                        style={[S.filePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <Ionicons name="document-outline" size={24} color="#ef4444" />
                        <Text style={[{ color: '#ef4444', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                          {pdfFile ?? 'اختر ملف PDF'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* ─ Rich text form ─ */}
                {selectedType === 'richtext' && (
                  <View style={S.formGroup}>
                    <FLabel text="محتوى الدرس" fs={fs} colors={colors} />
                    <NoteBox
                      text="استخدم الأدوات أعلاه لتنسيق النص: عريض، مائل، عناوين، قوائم، ألوان، وأحجام خط."
                      icon="information-circle-outline"
                      colors={colors} fs={fs}
                    />
                    <RichTextEditor
                      initialHTML={richHtml}
                      onChange={setRichHtml}
                      minHeight={320}
                    />
                  </View>
                )}

                {/* ─ Link form ─ */}
                {selectedType === 'link' && (
                  <View style={S.formGroup}>
                    <FLabel text="رابط المصدر *" fs={fs} colors={colors} />
                    <RInput value={linkUrl} onChange={setLinkUrl} placeholder="https://..." colors={colors} fs={fs} />
                    <NoteBox
                      text="سيُفتح الرابط داخل التطبيق فقط. الطلاب لن يرون الرابط الفعلي — سيظهر لهم العنوان فقط."
                      icon="lock-closed-outline"
                      colors={colors} fs={fs}
                    />
                  </View>
                )}

                {/* ─ Livestream form ─ */}
                {selectedType === 'livestream' && (
                  <View style={S.formGroup}>
                    <NoteBox
                      text="اختر موعد البث — ستظهر للطلاب المشتركين تذكيرات تلقائية قبل البدء."
                      icon="megaphone-outline"
                      colors={colors} fs={fs}
                    />

                    {/* Date row */}
                    <FLabel text="تاريخ البث *" fs={fs} colors={colors} />
                    <TouchableOpacity
                      onPress={() => { setShowDatePicker(true); setShowTimePicker(false); }}
                      style={[S.input, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }]}
                    >
                      <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }}>
                        {scheduledDate.toLocaleDateString('ar-IQ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>

                    {/* Time row */}
                    <FLabel text="وقت البث *" fs={fs} colors={colors} />
                    <TouchableOpacity
                      onPress={() => { setShowTimePicker(true); setShowDatePicker(false); }}
                      style={[S.input, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }]}
                    >
                      <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs }}>
                        {scheduledDate.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Ionicons name="time-outline" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>

                    {/* DateTimePickers */}
                    {showDatePicker && (
                      <DateTimePicker
                        value={scheduledDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        minimumDate={new Date()}
                        onChange={(_, d) => { setShowDatePicker(false); if (d) { const nd = new Date(d); nd.setHours(scheduledDate.getHours(), scheduledDate.getMinutes()); setScheduledDate(nd); } }}
                      />
                    )}
                    {showTimePicker && (
                      <DateTimePicker
                        value={scheduledDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, d) => { setShowTimePicker(false); if (d) { const nd = new Date(scheduledDate); nd.setHours(d.getHours(), d.getMinutes()); setScheduledDate(nd); } }}
                      />
                    )}

                    {/* Summary card */}
                    <View style={[{ borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 4, backgroundColor: '#f59e0b' + '10', borderColor: '#f59e0b' + '40' }]}>
                      <Text style={{ color: '#f59e0b', fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }}>
                        🕐 موعد البث:
                      </Text>
                      <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs, textAlign: 'right', marginTop: 4 }}>
                        {scheduledDate.toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {'  '}
                        {scheduledDate.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                )}

                {/* ─ MCQ form (multi-question) ─ */}
                {selectedType === 'mcq' && (
                  <View style={S.formGroup}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={[S.tfCountBadge, { backgroundColor: '#06b6d4' + '18', borderColor: '#06b6d4' + '40' }]}>
                        <Text style={[{ color: '#06b6d4', fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                          {mcqQuestions.length} سؤال · {mcqQuestions.reduce((s, q) => s + q.points, 0)} نقطة
                        </Text>
                      </View>
                    </View>

                    {mcqQuestions.map((mq, qi) => (
                      <View key={qi} style={[S.tfCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        {/* Card header */}
                        <View style={S.tfCardHeader}>
                          {mcqQuestions.length > 1 && (
                            <TouchableOpacity onPress={() => setMcqQuestions(prev => prev.filter((_, i) => i !== qi))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="trash-outline" size={17} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                            <View style={[S.tfNumBadge, { backgroundColor: '#06b6d4' }]}>
                              <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>{qi + 1}</Text>
                            </View>
                            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>اختيار من متعدد</Text>
                          </View>
                        </View>

                        {/* Question text */}
                        <TextInput value={mq.question} onChangeText={t => updateMcqQuestion(qi, { question: t })}
                          placeholder="اكتب السؤال هنا..." placeholderTextColor={colors.mutedForeground}
                          multiline textAlign="right"
                          style={[S.input, { color: colors.foreground, borderColor: colors.border + '80', backgroundColor: 'transparent', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, minHeight: 64, textAlignVertical: 'top' }]}
                        />

                        {/* Options */}
                        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs, textAlign: 'right' }]}>الخيارات — اضغط ✓ لتحديد الصحيح</Text>
                        {mq.options.map((opt, oi) => (
                          <View key={oi} style={[S.mcqRow, { borderColor: opt.isCorrect ? '#22c55e' : colors.border + '80', backgroundColor: opt.isCorrect ? '#22c55e10' : 'transparent' }]}>
                            <TouchableOpacity onPress={() => setMcqCorrect(qi, oi)} style={[S.mcqRadio, { borderColor: opt.isCorrect ? '#22c55e' : colors.border }]}>
                              {opt.isCorrect && <View style={S.mcqRadioInner} />}
                            </TouchableOpacity>
                            <TextInput value={opt.text} onChangeText={t => setMcqOptionText(qi, oi, t)}
                              placeholder={`الخيار ${['أ','ب','ج','د'][oi]}`} placeholderTextColor={colors.mutedForeground}
                              style={[S.mcqInput, { color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]} textAlign="right"
                            />
                            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, width: 20, textAlign: 'center' }]}>{['أ','ب','ج','د'][oi]}</Text>
                          </View>
                        ))}

                        {/* Points */}
                        <View style={[S.rowField, { justifyContent: 'flex-end' }]}>
                          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>النقاط:</Text>
                          <TextInput value={String(mq.points)} onChangeText={t => updateMcqQuestion(qi, { points: Number(t) || 0 })}
                            keyboardType="numeric" textAlign="center"
                            style={[S.input, { width: 64, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}
                          />
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity onPress={() => setMcqQuestions(prev => [...prev, defaultMcqQuestion()])}
                      style={[S.addPairBtn, { borderColor: '#06b6d4' + '50', backgroundColor: '#06b6d4' + '10' }]}>
                      <Ionicons name="add-circle-outline" size={20} color="#06b6d4" />
                      <Text style={[{ color: '#06b6d4', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>إضافة سؤال</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ─ True / False form (multi-question) ─ */}
                {selectedType === 'true_false' && (
                  <View style={S.formGroup}>

                    {/* Counter + points per question */}
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={S.rowField}>
                        <FLabel text="نقاط / سؤال" fs={fs} colors={colors} />
                        <RInput value={tfPoints} onChange={setTfPoints} keyboardType="numeric" colors={colors} fs={fs} style={{ width: 64, textAlign: 'center' }} />
                      </View>
                      <View style={[S.tfCountBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                        <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                          {tfQuestions.length} سؤال
                        </Text>
                        <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
                          · {tfQuestions.length * Number(tfPoints || 2)} نقطة
                        </Text>
                      </View>
                    </View>

                    {/* Question cards */}
                    {tfQuestions.map((q, idx) => (
                      <View
                        key={idx}
                        style={[S.tfCard, {
                          backgroundColor: colors.card,
                          borderColor: q.correct === null
                            ? colors.border
                            : q.correct ? '#22c55e40' : '#ef444440',
                        }]}
                      >
                        {/* Card header */}
                        <View style={S.tfCardHeader}>
                          {tfQuestions.length > 1 && (
                            <TouchableOpacity
                              onPress={() => setTfQuestions(prev => prev.filter((_, i) => i !== idx))}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={17} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                          <View style={[S.tfNumBadge, { backgroundColor: colors.primary }]}>
                            <Text style={[{ color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>
                              {idx + 1}
                            </Text>
                          </View>
                        </View>

                        {/* Statement input */}
                        <TextInput
                          value={q.statement}
                          onChangeText={t =>
                            setTfQuestions(prev => prev.map((x, i) => i === idx ? { ...x, statement: t } : x))
                          }
                          placeholder="اكتب العبارة هنا..."
                          placeholderTextColor={colors.mutedForeground}
                          multiline
                          textAlign="right"
                          style={[S.input, {
                            color: colors.foreground, borderColor: colors.border + '80',
                            backgroundColor: 'transparent',
                            fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs,
                            minHeight: 72, textAlignVertical: 'top',
                          }]}
                        />

                        {/* صح / خطأ answer picker */}
                        <View style={S.tfRow}>
                          {[
                            { v: true,  label: 'صح',  icon: 'checkmark-circle' as const, color: '#22c55e' },
                            { v: false, label: 'خطأ', icon: 'close-circle'     as const, color: '#ef4444' },
                          ].map(btn => {
                            const selected = q.correct === btn.v;
                            return (
                              <TouchableOpacity
                                key={String(btn.v)}
                                onPress={() =>
                                  setTfQuestions(prev => prev.map((x, i) => i === idx ? { ...x, correct: btn.v } : x))
                                }
                                style={[S.tfBtn, {
                                  borderColor: selected ? btn.color : colors.border,
                                  backgroundColor: selected ? btn.color + '22' : colors.background,
                                }]}
                              >
                                <Ionicons name={btn.icon} size={22} color={selected ? btn.color : colors.mutedForeground} />
                                <Text style={[{
                                  color: selected ? btn.color : colors.foreground,
                                  fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs,
                                }]}>
                                  {btn.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}

                    {/* Add question button */}
                    <TouchableOpacity
                      onPress={() => setTfQuestions(prev => [...prev, defaultTFQuestion()])}
                      style={[S.addPairBtn, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '10' }]}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                      <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                        إضافة سؤال
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ─ Fill blank form (multi-question) ─ */}
                {selectedType === 'fill_blank' && (
                  <View style={S.formGroup}>
                    <NoteBox text='استخدم ___ (ثلاث شرطات سفلية) لكل فراغ. مثال: عاصمة العراق هي ___' icon="information-circle-outline" colors={colors} fs={fs} />

                    <View style={[S.tfCountBadge, { backgroundColor: '#a855f7' + '18', borderColor: '#a855f7' + '40', alignSelf: 'flex-end' }]}>
                      <Text style={[{ color: '#a855f7', fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>{fbQuestions.length} سؤال</Text>
                    </View>

                    {fbQuestions.map((fbq, qi) => (
                      <View key={qi} style={[S.tfCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        <View style={S.tfCardHeader}>
                          {fbQuestions.length > 1 && (
                            <TouchableOpacity onPress={() => setFbQuestions(prev => prev.filter((_, i) => i !== qi))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="trash-outline" size={17} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                          <View style={[S.tfNumBadge, { backgroundColor: '#a855f7' }]}>
                            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>{qi + 1}</Text>
                          </View>
                        </View>

                        <TextInput value={fbq.text} onChangeText={t => onFbTextChange(qi, t)}
                          placeholder="مثال: عاصمة العراق هي ___" placeholderTextColor={colors.mutedForeground}
                          multiline textAlign="right"
                          style={[S.input, { color: colors.foreground, borderColor: colors.border + '80', backgroundColor: 'transparent', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, minHeight: 72, textAlignVertical: 'top' }]}
                        />

                        {fbq.answers.length > 0 && (
                          <View style={{ gap: 6 }}>
                            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs, textAlign: 'right' }]}>الإجابات ({fbq.answers.length} فراغ)</Text>
                            {fbq.answers.map((ans, ai) => (
                              <View key={ai} style={S.fbRow}>
                                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs, minWidth: 54, textAlign: 'right' }]}>فراغ {ai + 1}:</Text>
                                <TextInput value={ans} onChangeText={t => setFbAnswer(qi, ai, t)}
                                  placeholder={`إجابة ${ai + 1}`} placeholderTextColor={colors.mutedForeground}
                                  style={[S.input, { flex: 1, color: colors.foreground, borderColor: '#a855f7' + '50', backgroundColor: '#a855f7' + '08', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}
                                  textAlign="right"
                                />
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}

                    <TouchableOpacity onPress={() => setFbQuestions(prev => [...prev, defaultFbQuestion()])}
                      style={[S.addPairBtn, { borderColor: '#a855f7' + '50', backgroundColor: '#a855f7' + '10' }]}>
                      <Ionicons name="add-circle-outline" size={20} color="#a855f7" />
                      <Text style={[{ color: '#a855f7', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>إضافة سؤال</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ─ Q&A form (teacher writes questions; students write answers) ─ */}
                {selectedType === 'qa' && (
                  <View style={S.formGroup}>
                    <NoteBox text="الطالب يكتب جوابه بنفسه — أنت تكتب السؤال فقط" icon="information-circle-outline" colors={colors} fs={fs} />

                    {qaQuestions.map((q, idx) => (
                      <View key={idx} style={[S.qaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={S.qaCardHeader}>
                          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                            <View style={[S.tfNumBadge, { backgroundColor: '#f97316' }]}>
                              <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>{idx + 1}</Text>
                            </View>
                            <Text style={[{ color: '#f97316', fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>سؤال</Text>
                          </View>
                          {qaQuestions.length > 1 && (
                            <TouchableOpacity onPress={() => setQaQuestions(prev => prev.filter((_, i) => i !== idx))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="trash-outline" size={16} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <TextInput value={q.question}
                          onChangeText={t => setQaQuestions(prev => prev.map((p, i) => i === idx ? { question: t } : p))}
                          placeholder="اكتب سؤالك هنا... الطالب سيكتب شرحاً مفصلاً في خانة الجواب"
                          placeholderTextColor={colors.mutedForeground} multiline textAlign="right"
                          style={[S.input, { color: colors.foreground, borderColor: colors.border + '80', backgroundColor: 'transparent', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, minHeight: 80, textAlignVertical: 'top' }]}
                        />
                        <View style={[S.qaAnswerHint, { backgroundColor: '#f97316' + '0C', borderColor: '#f97316' + '30' }]}>
                          <Ionicons name="create-outline" size={14} color="#f97316" />
                          <Text style={[{ color: '#f97316', fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, flex: 1, textAlign: 'right' }]}>
                            خانة الجواب يملأها الطالب
                          </Text>
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity onPress={() => setQaQuestions(prev => [...prev, { question: '' }])}
                      style={[S.addPairBtn, { borderColor: '#f97316' + '50', backgroundColor: '#f97316' + '10' }]}>
                      <Ionicons name="add-circle-outline" size={18} color="#f97316" />
                      <Text style={[{ color: '#f97316', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>إضافة سؤال</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ─ Quiz builder (mix of all types) ─ */}
                {selectedType === 'quiz' && (
                  <View style={S.formGroup}>
                    {/* Time + count */}
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={[S.rowField]}>
                        <FLabel text="الوقت (دقيقة)" fs={fs} colors={colors} />
                        <RInput value={quizTimeLimit} onChange={setQuizTimeLimit} keyboardType="numeric" colors={colors} fs={fs} style={{ width: 70, textAlign: 'center' }} />
                      </View>
                      <View style={[S.tfCountBadge, { backgroundColor: '#ec4899' + '18', borderColor: '#ec4899' + '40' }]}>
                        <Text style={[{ color: '#ec4899', fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                          {quizItems.length} سؤال
                        </Text>
                      </View>
                    </View>

                    {/* Quiz items */}
                    {quizItems.map((item) => (
                      <View key={item.id} style={[S.tfCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        {/* Item header */}
                        <View style={S.tfCardHeader}>
                          <TouchableOpacity onPress={() => setQuizItems(prev => prev.filter(it => it.id !== item.id))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={17} color="#ef4444" />
                          </TouchableOpacity>
                          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                            <View style={[S.tfNumBadge, { backgroundColor: item.type === 'mcq' ? '#06b6d4' : item.type === 'true_false' ? '#22c55e' : item.type === 'fill_blank' ? '#a855f7' : '#f97316' }]}>
                              <Ionicons name={item.type === 'mcq' ? 'radio-button-on' : item.type === 'true_false' ? 'checkmark-circle' : item.type === 'fill_blank' ? 'pencil' : 'help-circle'} size={13} color="#fff" />
                            </View>
                            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                              {item.type === 'mcq' ? 'اختيار من متعدد' : item.type === 'true_false' ? 'صح وخطأ' : item.type === 'fill_blank' ? 'ملء الفراغات' : 'سؤال مفتوح'}
                            </Text>
                          </View>
                        </View>

                        {/* MCQ inside quiz */}
                        {item.type === 'mcq' && (
                          <View style={{ gap: 8 }}>
                            <TextInput value={item.mcqQuestion ?? ''} onChangeText={t => updateQuizItem(item.id, { mcqQuestion: t })}
                              placeholder="اكتب السؤال..." placeholderTextColor={colors.mutedForeground} multiline textAlign="right"
                              style={[S.input, { color: colors.foreground, borderColor: colors.border + '60', backgroundColor: 'transparent', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, minHeight: 56, textAlignVertical: 'top' }]}
                            />
                            {(item.mcqOptions ?? defaultMcqOptions()).map((opt, oi) => (
                              <View key={oi} style={[S.mcqRow, { borderColor: opt.isCorrect ? '#22c55e' : colors.border + '60', backgroundColor: opt.isCorrect ? '#22c55e10' : 'transparent' }]}>
                                <TouchableOpacity onPress={() => updateQuizItem(item.id, { mcqOptions: (item.mcqOptions ?? defaultMcqOptions()).map((o, i) => ({ ...o, isCorrect: i === oi })) })}
                                  style={[S.mcqRadio, { borderColor: opt.isCorrect ? '#22c55e' : colors.border }]}>
                                  {opt.isCorrect && <View style={S.mcqRadioInner} />}
                                </TouchableOpacity>
                                <TextInput value={opt.text} onChangeText={t => updateQuizItem(item.id, { mcqOptions: (item.mcqOptions ?? defaultMcqOptions()).map((o, i) => i === oi ? { ...o, text: t } : o) })}
                                  placeholder={`الخيار ${['أ','ب','ج','د'][oi]}`} placeholderTextColor={colors.mutedForeground}
                                  style={[S.mcqInput, { color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]} textAlign="right"
                                />
                                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, width: 18 }]}>{['أ','ب','ج','د'][oi]}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* True/False inside quiz */}
                        {item.type === 'true_false' && (
                          <View style={{ gap: 8 }}>
                            <TextInput value={item.tfStatement ?? ''} onChangeText={t => updateQuizItem(item.id, { tfStatement: t })}
                              placeholder="اكتب العبارة..." placeholderTextColor={colors.mutedForeground} multiline textAlign="right"
                              style={[S.input, { color: colors.foreground, borderColor: colors.border + '60', backgroundColor: 'transparent', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, minHeight: 56, textAlignVertical: 'top' }]}
                            />
                            <View style={S.tfRow}>
                              {[{ v: true, label: 'صح', color: '#22c55e' }, { v: false, label: 'خطأ', color: '#ef4444' }].map(btn => {
                                const sel = item.tfCorrect === btn.v;
                                return (
                                  <TouchableOpacity key={String(btn.v)} onPress={() => updateQuizItem(item.id, { tfCorrect: btn.v })}
                                    style={[S.tfBtn, { borderColor: sel ? btn.color : colors.border, backgroundColor: sel ? btn.color + '22' : colors.background }]}>
                                    <Text style={[{ color: sel ? btn.color : colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>{btn.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {/* Fill blank inside quiz */}
                        {item.type === 'fill_blank' && (
                          <View style={{ gap: 8 }}>
                            <TextInput value={item.fbText ?? ''} onChangeText={t => quizItemFbTextChange(item.id, t)}
                              placeholder="مثال: عاصمة العراق هي ___" placeholderTextColor={colors.mutedForeground} multiline textAlign="right"
                              style={[S.input, { color: colors.foreground, borderColor: colors.border + '60', backgroundColor: 'transparent', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, minHeight: 56, textAlignVertical: 'top' }]}
                            />
                            {(item.fbAnswers ?? []).map((ans, ai) => (
                              <View key={ai} style={S.fbRow}>
                                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs, minWidth: 50, textAlign: 'right' }]}>فراغ {ai + 1}:</Text>
                                <TextInput value={ans} onChangeText={t => updateQuizItem(item.id, { fbAnswers: (item.fbAnswers ?? []).map((a, j) => j === ai ? t : a) })}
                                  placeholder={`إجابة ${ai + 1}`} placeholderTextColor={colors.mutedForeground}
                                  style={[S.input, { flex: 1, color: colors.foreground, borderColor: '#a855f7' + '40', backgroundColor: '#a855f7' + '08', fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]} textAlign="right"
                                />
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Q&A inside quiz */}
                        {item.type === 'qa' && (
                          <View style={{ gap: 6 }}>
                            <TextInput value={item.qaQuestion ?? ''} onChangeText={t => updateQuizItem(item.id, { qaQuestion: t })}
                              placeholder="اكتب سؤالك... الطالب يكتب جوابه" placeholderTextColor={colors.mutedForeground} multiline textAlign="right"
                              style={[S.input, { color: colors.foreground, borderColor: colors.border + '60', backgroundColor: 'transparent', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, minHeight: 64, textAlignVertical: 'top' }]}
                            />
                            <View style={[S.qaAnswerHint, { backgroundColor: '#f97316' + '0C', borderColor: '#f97316' + '30' }]}>
                              <Ionicons name="create-outline" size={14} color="#f97316" />
                              <Text style={[{ color: '#f97316', fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs, flex: 1, textAlign: 'right' }]}>خانة الجواب يملأها الطالب</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    ))}

                    {/* Add question button / type picker */}
                    {!showQuizTypePicker ? (
                      <TouchableOpacity onPress={() => setShowQuizTypePicker(true)}
                        style={[S.addPairBtn, { borderColor: '#ec4899' + '50', backgroundColor: '#ec4899' + '10' }]}>
                        <Ionicons name="add-circle-outline" size={20} color="#ec4899" />
                        <Text style={[{ color: '#ec4899', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>إضافة سؤال للاختبار</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[S.quizTypePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, textAlign: 'right', marginBottom: 8 }]}>اختر نوع السؤال</Text>
                        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                          {[
                            { type: 'mcq' as QuizItemType, label: 'اختيار متعدد', icon: 'radio-button-on' as const, color: '#06b6d4' },
                            { type: 'true_false' as QuizItemType, label: 'صح / خطأ', icon: 'checkmark-circle' as const, color: '#22c55e' },
                            { type: 'fill_blank' as QuizItemType, label: 'ملء الفراغات', icon: 'pencil' as const, color: '#a855f7' },
                            { type: 'qa' as QuizItemType, label: 'سؤال مفتوح', icon: 'help-circle' as const, color: '#f97316' },
                          ].map(opt => (
                            <TouchableOpacity key={opt.type}
                              onPress={() => { setQuizItems(prev => [...prev, newQuizItem(opt.type)]); setShowQuizTypePicker(false); }}
                              style={[S.quizTypeOption, { backgroundColor: opt.color + '18', borderColor: opt.color + '50' }]}>
                              <Ionicons name={opt.icon} size={18} color={opt.color} />
                              <Text style={[{ color: opt.color, fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>{opt.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TouchableOpacity onPress={() => setShowQuizTypePicker(false)} style={{ alignSelf: 'center', marginTop: 8 }}>
                          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>إلغاء</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* ─ Assignment form ─ */}
                {selectedType === 'assignment' && (
                  <View style={S.formGroup}>
                    <FLabel text="تعليمات الواجب" fs={fs} colors={colors} />
                    <RInput value={assignInstructions} onChange={setAssignInstructions} multiline placeholder="اكتب التعليمات والمتطلبات..." colors={colors} fs={fs} />
                    <View style={S.rowField}>
                      <FLabel text="النقاط الكاملة" fs={fs} colors={colors} />
                      <RInput value={assignPoints} onChange={setAssignPoints} keyboardType="numeric" colors={colors} fs={fs} style={{ width: 80, textAlign: 'center' }} />
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  headerSide: { minWidth: 60, alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  cancelText: {},
  addBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },

  // Section
  section: { padding: 16, paddingBottom: 16, borderBottomWidth: 1, gap: 8 },

  // Tabs
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabText: {},

  // Type grid: 3 columns
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10, paddingBottom: 4 },
  typeCard: {
    width: '30%', flexGrow: 1, maxWidth: '32%',
    borderRadius: 14, borderWidth: 1.5,
    padding: 12, alignItems: 'center', gap: 6,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { textAlign: 'center' },
  typeSubLabel: { textAlign: 'center' },

  // Form
  form: { padding: 16, gap: 16, borderTopWidth: 1 },
  formGroup: { gap: 10 },
  typeBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-end' },

  // Common field
  flabel: { textAlign: 'right' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  hint: { textAlign: 'right', paddingHorizontal: 2 },

  // Note
  note: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },

  // Source toggle
  sourceToggle: { flexDirection: 'row-reverse', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  sourceBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },

  // File picker
  filePicker: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 20, alignItems: 'center', gap: 8 },

  // MCQ
  mcqRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  mcqRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mcqRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  mcqInput: { flex: 1, paddingVertical: 4 },

  // True/False
  tfCountBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  tfCard: { borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 10 },
  tfCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  tfNumBadge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tfRow: { flexDirection: 'row-reverse', gap: 12 },
  tfBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 2 },

  // Fill blank
  fbRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },

  // Q&A
  qaCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  qaCardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  qaAnswerHint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, borderWidth: 1 },
  addPairBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },

  // Quiz builder
  quizTypePicker: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  quizTypeOption: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },

  // Progress bar (chunked upload)
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', width: '100%' },
  progressFill:  { height: 8, borderRadius: 4 },
  errorBox:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, backgroundColor: '#fef2f2' },
  cancelUploadBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },

  // Shared
  rowField: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, justifyContent: 'flex-start' },
});
