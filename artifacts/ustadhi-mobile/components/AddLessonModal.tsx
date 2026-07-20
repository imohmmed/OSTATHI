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
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { RichTextEditor } from './RichTextEditor';
import { useCreateLesson, getGetCourseQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

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

// ─── MCQ state ──────────────────────────────────────────────────────────────────
interface McqOption { text: string; isCorrect: boolean }
const defaultMcqOptions = (): McqOption[] => [
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
];

// ─── True/False question ────────────────────────────────────────────────────────
interface TFQuestion { statement: string; correct: boolean | null }
const defaultTFQuestion = (): TFQuestion => ({ statement: '', correct: null });

// ─── Q&A pair ───────────────────────────────────────────────────────────────────
interface QAPair { question: string; answer: string }

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

  // ── Video
  const [videoSource, setVideoSource] = useState<'url' | 'file'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<string | null>(null);
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

  // ── MCQ
  const [mcqQuestion, setMcqQuestion] = useState('');
  const [mcqOptions, setMcqOptions] = useState<McqOption[]>(defaultMcqOptions());
  const [mcqPoints, setMcqPoints] = useState('5');

  // ── True/False (multi-question)
  const [tfQuestions, setTfQuestions] = useState<TFQuestion[]>([defaultTFQuestion()]);
  const [tfPoints, setTfPoints] = useState('2');

  // ── Fill blank
  const [fbText, setFbText] = useState('');
  const [fbAnswers, setFbAnswers] = useState<string[]>([]);

  // ── Q&A
  const [qaPairs, setQaPairs] = useState<QAPair[]>([{ question: '', answer: '' }]);

  // ── Quiz
  const [quizTimeLimit, setQuizTimeLimit] = useState('30');

  // ── Assignment
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignPoints, setAssignPoints] = useState('10');

  // ────────────────────────────────────────────────────────────────────────────
  const reset = () => {
    setActiveTab('all'); setSelectedType(null); setTitle('');
    setVideoSource('url'); setVideoUrl(''); setVideoFile(null); setDurationMin('');
    setPdfSource('url'); setPdfUrl(''); setPdfFile(null);
    setRichHtml(''); setLinkUrl(''); setStreamUrl('');
    setMcqQuestion(''); setMcqOptions(defaultMcqOptions()); setMcqPoints('5');
    setTfQuestions([defaultTFQuestion()]); setTfPoints('2');
    setFbText(''); setFbAnswers([]);
    setQaPairs([{ question: '', answer: '' }]);
    setQuizTimeLimit('30'); setAssignInstructions(''); setAssignPoints('10');
  };

  const handleClose = () => { reset(); onClose(); };

  // ── File picker ───────────────────────────────────────────────────────────
  const pickVideoFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/*', 'video/mp4', 'video/x-m4v'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoFile(result.assets[0].name);
      setVideoUrl(result.assets[0].uri);
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

  // ── Fill blank helper ─────────────────────────────────────────────────────
  const onFbTextChange = (t: string) => {
    setFbText(t);
    const blanks = (t.match(/___/g) || []).length;
    setFbAnswers(prev => {
      const arr = [...prev];
      while (arr.length < blanks) arr.push('');
      return arr.slice(0, blanks);
    });
  };

  // ── MCQ helpers ───────────────────────────────────────────────────────────
  const setMcqCorrect = (idx: number) =>
    setMcqOptions(prev => prev.map((o, i) => ({ ...o, isCorrect: i === idx })));
  const setMcqOptionText = (idx: number, t: string) =>
    setMcqOptions(prev => prev.map((o, i) => i === idx ? { ...o, text: t } : o));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!title.trim()) { Alert.alert('خطأ', 'عنوان المحاضرة مطلوب'); return; }
    if (!selectedType) { Alert.alert('خطأ', 'اختر نوع المحاضرة'); return; }

    let contentUrl: string | undefined;
    let contentText: string | undefined;
    let duration: number | undefined;
    const order = lessonsCount + 1;

    switch (selectedType) {
      case 'video':
        contentUrl = videoUrl.trim() || undefined;
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
      case 'livestream':
        contentUrl = streamUrl.trim() || undefined;
        break;
      case 'mcq':
        if (!mcqQuestion.trim()) { Alert.alert('خطأ', 'نص السؤال مطلوب'); return; }
        contentText = JSON.stringify({ question: mcqQuestion, options: mcqOptions, points: Number(mcqPoints) });
        break;
      case 'true_false': {
        const unanswered = tfQuestions.findIndex(q => !q.statement.trim() || q.correct === null);
        if (unanswered !== -1) {
          Alert.alert('خطأ', `السؤال ${unanswered + 1}: اكتب العبارة وحدد الإجابة الصحيحة`);
          return;
        }
        contentText = JSON.stringify({ questions: tfQuestions, pointsPerQuestion: Number(tfPoints) });
        break;
      }
      case 'fill_blank':
        if (!fbText.trim()) { Alert.alert('خطأ', 'النص مطلوب'); return; }
        contentText = JSON.stringify({ text: fbText, answers: fbAnswers });
        break;
      case 'qa':
        contentText = JSON.stringify({ pairs: qaPairs });
        break;
      case 'quiz':
        contentText = JSON.stringify({ timeLimit: Number(quizTimeLimit) });
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
              disabled={createLesson.isPending}
              style={[S.headerSide, S.addBtn, { backgroundColor: colors.primary, opacity: createLesson.isPending ? 0.6 : 1 }]}
            >
              <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                {createLesson.isPending ? '...' : 'إضافة'}
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
                      <TouchableOpacity
                        onPress={pickVideoFile}
                        style={[S.filePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                        <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                          {videoFile ?? 'اختر ملف فيديو'}
                        </Text>
                        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                          mp4، m4v وصيغ أخرى
                        </Text>
                      </TouchableOpacity>
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
                      text="عند الضغط على 'إضافة' سيُنشأ البث وتصل إشعارات فورية لكل الطلاب المشتركين في هذه الدورة."
                      icon="megaphone-outline"
                      colors={colors} fs={fs}
                    />
                    <FLabel text="رابط البث المباشر (اختياري)" fs={fs} colors={colors} />
                    <RInput value={streamUrl} onChange={setStreamUrl} placeholder="rtmp:// أو https://..." colors={colors} fs={fs} />
                    <Text style={[S.hint, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                      يمكنك إضافة الرابط لاحقاً قبل بدء البث
                    </Text>
                  </View>
                )}

                {/* ─ MCQ form ─ */}
                {selectedType === 'mcq' && (
                  <View style={S.formGroup}>
                    <FLabel text="نص السؤال *" fs={fs} colors={colors} />
                    <RInput value={mcqQuestion} onChange={setMcqQuestion} multiline placeholder="اكتب السؤال هنا..." colors={colors} fs={fs} />

                    <FLabel text="الخيارات (اضغط ✓ لتحديد الصحيح)" fs={fs} colors={colors} />
                    {mcqOptions.map((opt, idx) => (
                      <View key={idx} style={[S.mcqRow, { borderColor: opt.isCorrect ? '#22c55e' : colors.border, backgroundColor: opt.isCorrect ? '#22c55e10' : colors.card }]}>
                        <TouchableOpacity onPress={() => setMcqCorrect(idx)} style={[S.mcqRadio, { borderColor: opt.isCorrect ? '#22c55e' : colors.border }]}>
                          {opt.isCorrect && <View style={S.mcqRadioInner} />}
                        </TouchableOpacity>
                        <TextInput
                          value={opt.text}
                          onChangeText={(t) => setMcqOptionText(idx, t)}
                          placeholder={`الخيار ${['أ','ب','ج','د'][idx]}`}
                          placeholderTextColor={colors.mutedForeground}
                          style={[S.mcqInput, { color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                          textAlign="right"
                        />
                        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs, width: 24, textAlign: 'center' }]}>
                          {['أ','ب','ج','د'][idx]}
                        </Text>
                      </View>
                    ))}

                    <View style={S.rowField}>
                      <FLabel text="النقاط" fs={fs} colors={colors} />
                      <RInput value={mcqPoints} onChange={setMcqPoints} keyboardType="numeric" colors={colors} fs={fs} style={{ width: 80, textAlign: 'center' }} />
                    </View>
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

                {/* ─ Fill blank form ─ */}
                {selectedType === 'fill_blank' && (
                  <View style={S.formGroup}>
                    <NoteBox text='اكتب النص واستخدم ___ (ثلاثة شرطات سفلية) لتمييز كل فراغ. مثال: عاصمة العراق هي ___' icon="information-circle-outline" colors={colors} fs={fs} />
                    <FLabel text="النص مع الفراغات *" fs={fs} colors={colors} />
                    <RInput value={fbText} onChange={onFbTextChange} multiline placeholder="مثال: عاصمة العراق هي ___" colors={colors} fs={fs} />

                    {fbAnswers.length > 0 && (
                      <>
                        <FLabel text={`الإجابات (${fbAnswers.length} فراغ)`} fs={fs} colors={colors} />
                        {fbAnswers.map((ans, idx) => (
                          <View key={idx} style={S.fbRow}>
                            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, minWidth: 60, textAlign: 'right' }]}>
                              فراغ {idx + 1}:
                            </Text>
                            <TextInput
                              value={ans}
                              onChangeText={t => setFbAnswers(prev => prev.map((a, i) => i === idx ? t : a))}
                              placeholder={`إجابة الفراغ ${idx + 1}`}
                              placeholderTextColor={colors.mutedForeground}
                              style={[S.input, { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}
                              textAlign="right"
                            />
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}

                {/* ─ Q&A form ─ */}
                {selectedType === 'qa' && (
                  <View style={S.formGroup}>
                    {qaPairs.map((pair, idx) => (
                      <View key={idx} style={[S.qaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={S.qaCardHeader}>
                          <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                            سؤال {idx + 1}
                          </Text>
                          {qaPairs.length > 1 && (
                            <TouchableOpacity onPress={() => setQaPairs(prev => prev.filter((_, i) => i !== idx))}>
                              <Ionicons name="trash-outline" size={16} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <TextInput
                          value={pair.question}
                          onChangeText={t => setQaPairs(prev => prev.map((p, i) => i === idx ? { ...p, question: t } : p))}
                          placeholder="السؤال..."
                          placeholderTextColor={colors.mutedForeground}
                          multiline
                          style={[S.input, { color: colors.foreground, borderColor: colors.border + '80', backgroundColor: 'transparent', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                          textAlign="right"
                        />
                        <TextInput
                          value={pair.answer}
                          onChangeText={t => setQaPairs(prev => prev.map((p, i) => i === idx ? { ...p, answer: t } : p))}
                          placeholder="الجواب..."
                          placeholderTextColor={colors.mutedForeground}
                          multiline
                          style={[S.input, { color: '#22c55e', borderColor: '#22c55e30', backgroundColor: '#22c55e08', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                          textAlign="right"
                        />
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={() => setQaPairs(prev => [...prev, { question: '', answer: '' }])}
                      style={[S.addPairBtn, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '10' }]}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                        إضافة سؤال
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ─ Quiz form ─ */}
                {selectedType === 'quiz' && (
                  <View style={S.formGroup}>
                    <NoteBox text="سيُنشأ الاختبار فارغاً. يمكنك إضافة أسئلة من نوع MCQ وصح/خطأ وملء فراغات بعد الحفظ." icon="school-outline" colors={colors} fs={fs} />
                    <View style={S.rowField}>
                      <FLabel text="الوقت المسموح (دقيقة)" fs={fs} colors={colors} />
                      <RInput value={quizTimeLimit} onChange={setQuizTimeLimit} keyboardType="numeric" colors={colors} fs={fs} style={{ width: 80, textAlign: 'center' }} />
                    </View>
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
  addPairBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },

  // Shared
  rowField: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, justifyContent: 'flex-start' },
});
