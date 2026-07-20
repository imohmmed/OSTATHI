/**
 * Lesson edit screen — opened by the teacher when they tap a lesson row.
 * Route: /lesson/[id]?courseId=<courseId>
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  useGetCourse,
  useUpdateLesson,
  getGetCourseQueryKey,
} from '@workspace/api-client-react';

// ─── Type config ──────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  video: 'فيديو',
  pdf: 'PDF',
  richtext: 'نص منسّق',
  link: 'رابط ويب',
  livestream: 'بث مباشر',
  mcq: 'اختيار من متعدد',
  true_false: 'صح وخطأ',
  fill_blank: 'ملء الفراغات',
  qa: 'أسئلة وأجوبة',
  quiz: 'اختبار',
  assignment: 'واجب',
  text: 'نص',
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  video: 'play-circle',
  pdf: 'document',
  richtext: 'create',
  link: 'earth',
  livestream: 'radio',
  mcq: 'radio-button-on',
  true_false: 'checkmark-circle',
  fill_blank: 'pencil',
  qa: 'help-circle',
  quiz: 'school',
  assignment: 'clipboard',
  text: 'document-text',
};

const TYPE_COLORS: Record<string, string> = {
  video: '#3b82f6', pdf: '#ef4444', richtext: '#8b5cf6',
  link: '#10b981', livestream: '#f59e0b', mcq: '#06b6d4',
  true_false: '#22c55e', fill_blank: '#a855f7', qa: '#f97316',
  quiz: '#ec4899', assignment: '#64748b', text: '#6b7280',
};

const URL_TYPES = ['video', 'pdf', 'link', 'livestream'];
const TEXT_TYPES = ['text', 'assignment'];
const RICH_TYPES = ['richtext'];
const DURATION_TYPES = ['video', 'livestream'];

// ─── Field label ──────────────────────────────────────────────────
function FLabel({ text, colors, fs }: { text: string; colors: any; fs: number }) {
  return (
    <Text style={[S.flabel, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
      {text}
    </Text>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function LessonEditScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const lessonId = Number(id);
  const cId = Number(courseId);

  const router = useRouter();
  const colors = useColors();
  const { fontScale } = useApp();
  const fs = fontScale;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: course } = useGetCourse(cId);
  const lesson = course?.lessons?.find((l: any) => l.id === lessonId);
  const updateLesson = useUpdateLesson();

  // ── Form state ──────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [contentText, setContentText] = useState('');
  const [richHtml, setRichHtml] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [detectingDuration, setDetectingDuration] = useState(false);
  const [durationAutoDetected, setDurationAutoDetected] = useState(false);
  const durationDetectedRef = useRef(false);

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title ?? '');
    setContentUrl(lesson.contentUrl ?? '');
    setContentText(lesson.contentText ?? '');
    setRichHtml(lesson.contentText ?? '');
    setDurationMin(lesson.duration ? String(Math.round(lesson.duration / 60)) : '');
    setIsPublished(lesson.isPublished ?? true);
    durationDetectedRef.current = !!lesson.duration;
  }, [lesson]);

  // ── Auto-detect duration from URL ──────────────────────────────
  const isVideoType = type === 'video' || type === 'livestream';
  const videoSource = isVideoType && contentUrl.trim() ? contentUrl.trim() : null;

  const durationPlayer = useVideoPlayer(videoSource, (p) => {
    p.pause();
    p.muted = true;
  });

  useEffect(() => {
    if (!videoSource || durationDetectedRef.current) return;
    setDetectingDuration(true);
    setDurationAutoDetected(false);
  }, [videoSource]);

  useEffect(() => {
    if (!durationPlayer || durationDetectedRef.current) return;
    const dur = durationPlayer.duration;
    if (dur && dur > 0 && isFinite(dur)) {
      const mins = Math.max(1, Math.round(dur / 60));
      setDurationMin(String(mins));
      setDetectingDuration(false);
      setDurationAutoDetected(true);
      durationDetectedRef.current = true;
    }
  }, [durationPlayer?.duration]);

  const type = lesson?.type ?? 'video';
  const needsUrl = URL_TYPES.includes(type);
  const needsText = TEXT_TYPES.includes(type);
  const needsRich = RICH_TYPES.includes(type);
  const needsDuration = DURATION_TYPES.includes(type);

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!title.trim()) { Alert.alert('خطأ', 'العنوان مطلوب'); return; }
    updateLesson.mutate(
      {
        id: lessonId,
        data: {
          title: title.trim(),
          contentUrl: needsUrl ? (contentUrl.trim() || null) : undefined,
          contentText: needsRich
            ? (richHtml || null)
            : needsText
            ? (contentText.trim() || null)
            : undefined,
          duration: needsDuration
            ? (durationMin ? Math.round(parseFloat(durationMin) * 60) : null)
            : undefined,
          isPublished,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(cId) });
          router.back();
        },
        onError: () => Alert.alert('خطأ', 'فشل حفظ التعديلات، حاول مجدداً'),
      }
    );
  };

  const handleRichChange = useCallback((html: string) => { setRichHtml(html); }, []);

  // ── Loading state ──────────────────────────────────────────────
  if (!lesson) {
    return (
      <View style={[S.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 }}>
          جار التحميل...
        </Text>
      </View>
    );
  }

  const typeColor = TYPE_COLORS[type] ?? '#6b7280';
  const typeIcon = (TYPE_ICONS[type] ?? 'book') as keyof typeof Ionicons.glyphMap;
  const typeLabel = TYPE_LABELS[type] ?? type;

  return (
    <View style={[S.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          S.header,
          {
            backgroundColor: '#101D36',
            paddingTop: insets.top + 10,
            borderBottomColor: 'rgba(255,255,255,0.1)',
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={S.headerBtn}>
          <Text style={[S.cancelText, { fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
            إلغاء
          </Text>
        </TouchableOpacity>

        <Text style={[S.headerTitle, { fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>
          تعديل المحاضرة
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={updateLesson.isPending}
          style={[S.saveBtn, { opacity: updateLesson.isPending ? 0.6 : 1 }]}
        >
          <Text style={[S.saveBtnText, { fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
            {updateLesson.isPending ? '...' : 'حفظ'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[S.body, { paddingBottom: 40 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type badge */}
          <View style={[S.typeBadge, { backgroundColor: typeColor + '18', borderColor: typeColor + '40' }]}>
            <Ionicons name={typeIcon} size={16} color={typeColor} />
            <Text style={[{ color: typeColor, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
              {typeLabel}
            </Text>
          </View>

          {/* Title */}
          <View style={S.fieldGroup}>
            <FLabel text="عنوان المحاضرة *" colors={colors} fs={fs} />
            <TextInput
              style={[S.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
              placeholder="عنوان المحاضرة"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              textAlign="right"
            />
          </View>

          {/* Content URL */}
          {needsUrl && (
            <View style={S.fieldGroup}>
              <FLabel
                text={
                  type === 'video' ? 'رابط الفيديو' :
                  type === 'pdf'   ? 'رابط ملف PDF' :
                  type === 'livestream' ? 'رابط البث المباشر' : 'الرابط'
                }
                colors={colors}
                fs={fs}
              />
              <TextInput
                style={[S.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                placeholder="https://..."
                placeholderTextColor={colors.mutedForeground}
                value={contentUrl}
                onChangeText={setContentUrl}
                keyboardType="url"
                autoCapitalize="none"
                textAlign="left"
              />
              {type === 'link' && (
                <Text style={[S.hint, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
                  🔒 يُفتح داخل التطبيق — الطلاب لا يرون الرابط
                </Text>
              )}
            </View>
          )}

          {/* Plain text */}
          {needsText && (
            <View style={S.fieldGroup}>
              <FLabel
                text={type === 'assignment' ? 'تعليمات الواجب' : 'محتوى الدرس'}
                colors={colors}
                fs={fs}
              />
              <TextInput
                style={[S.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}
                placeholder="اكتب المحتوى هنا..."
                placeholderTextColor={colors.mutedForeground}
                value={contentText}
                onChangeText={setContentText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                textAlign="right"
              />
            </View>
          )}

          {/* Rich text editor */}
          {needsRich && (
            <View style={S.fieldGroup}>
              <FLabel text="المحتوى المنسّق" colors={colors} fs={fs} />
              <View style={[S.richWrap, { borderColor: colors.border }]}>
                <RichTextEditor
                  initialHtml={richHtml}
                  onChange={handleRichChange}
                  minHeight={260}
                />
              </View>
            </View>
          )}

          {/* Duration */}
          {needsDuration && (
            <View style={S.fieldGroup}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
                <FLabel text="مدة الفيديو (بالدقائق)" colors={colors} fs={fs} />
                {detectingDuration && (
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }}>
                      جاري الاكتشاف...
                    </Text>
                  </View>
                )}
                {durationAutoDetected && !detectingDuration && (
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
                    <Text style={{ color: '#22c55e', fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }}>
                      تم الاكتشاف تلقائياً
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                <TextInput
                  style={[S.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, width: 130 }]}
                  placeholder="45"
                  placeholderTextColor={colors.mutedForeground}
                  value={durationMin}
                  onChangeText={(v) => {
                    setDurationMin(v);
                    setDurationAutoDetected(false);
                    durationDetectedRef.current = false;
                  }}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }}>
                  دقيقة
                </Text>
              </View>
            </View>
          )}

          {/* Published toggle */}
          <View style={[S.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={S.toggleInfo}>
              <View style={[S.iconBox, { backgroundColor: colors.muted }]}>
                <Ionicons name="eye-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                  منشورة
                </Text>
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
                  {isPublished ? 'مرئية للطلاب' : 'مخفية عن الطلاب'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBtn: { paddingVertical: 4, paddingHorizontal: 4, minWidth: 50 },
  cancelText: { color: 'rgba(255,255,255,0.7)' },
  headerTitle: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saveBtnText: { color: '#101D36' },
  body: { padding: 20, gap: 24 },
  typeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  fieldGroup: { gap: 8 },
  flabel: {},
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 160,
  },
  richWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hint: { textAlign: 'right', marginTop: 4 },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
