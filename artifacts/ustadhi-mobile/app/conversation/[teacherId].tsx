/**
 * شاشة محادثة الطالب مع أستاذ معين
 * يستخدم نظام المحادثات الحقيقي (chat_messages)
 * - رسائل غير محدودة من الطالب
 * - optimistic updates: تظهر الرسالة فوراً
 * - صور وملفات
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useChatMessages,
  useSendChatMessage,
  useMarkChatRead,
  uploadChatAttachment,
  type ChatMsg,
} from '@/hooks/useChat';
import colors from '@/constants/colors';

interface PendingAttachment {
  uri: string;
  name: string;
  type: string;
  kind: 'image' | 'file';
}

function AttachmentBubble({ url, type, name, textColor }: {
  url: string; type?: string | null; name?: string | null; textColor: string;
}) {
  if (type === 'image') {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(url)}>
        <Image source={{ uri: url }} style={styles.attachImg} resizeMode="cover" />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url)}
      style={[styles.fileChip, { borderColor: 'rgba(255,255,255,0.25)' }]}
    >
      <Ionicons name="document-outline" size={16} color={textColor} />
      <Text style={{ color: textColor, fontFamily: 'Tajawal_400Regular', fontSize: 12 }} numberOfLines={1}>
        {name ?? 'ملف مرفق'}
      </Text>
    </TouchableOpacity>
  );
}

export default function ConversationPage() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const c = useColors();
  const fs = fontScale;
  const listRef = useRef<FlatList>(null);

  const params = useLocalSearchParams<{ teacherId: string; teacherName: string }>();
  const teacherId = Number(params.teacherId);
  const teacherName = decodeURIComponent(params.teacherName ?? 'الأستاذ');

  const studentId = user?.id ?? 0;

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: messages, isLoading } = useChatMessages(studentId, teacherId);
  const sendMsg = useSendChatMessage(studentId, teacherId);
  const markRead = useMarkChatRead(studentId, teacherId);

  // علّم كمقروءة عند فتح الشاشة
  useEffect(() => {
    if (studentId && teacherId) {
      markRead.mutate('student');
    }
  }, [studentId, teacherId]);

  // ── اختيار صورة ──────────────────────────────────────────
  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('الإذن مرفوض', 'يرجى السماح بالوصول إلى الصور من الإعدادات');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const name = a.fileName ?? `photo_${Date.now()}.jpg`;
      setPending({ uri: a.uri, name, type: a.mimeType ?? 'image/jpeg', kind: 'image' });
    }
  }, []);

  // ── اختيار ملف ───────────────────────────────────────────
  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPending({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', kind: 'file' });
    }
  }, []);

  // ── إرسال ─────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if ((!draft.trim() && !pending) || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;
    let attachmentName: string | undefined;

    const textToSend = draft.trim();
    setDraft('');

    if (pending) {
      setPending(null);
      setUploading(true);
      try {
        const res = await uploadChatAttachment(pending.uri, pending.name, pending.type);
        attachmentUrl = res.url;
        attachmentType = res.type;
        attachmentName = res.name;
      } catch (e: any) {
        Alert.alert('خطأ في الرفع', e.message ?? 'فشل رفع الملف، تأكد من نوع الملف وحاول مجدداً');
        setUploading(false);
        setDraft(textToSend); // استعادة النص
        return;
      }
      setUploading(false);
    }

    sendMsg.mutate({
      senderType: 'student',
      senderName: user.fullName,
      text: textToSend || undefined,
      attachmentUrl,
      attachmentType,
      attachmentName,
    });
  }, [draft, pending, user, sendMsg]);

  const isBusy = uploading || sendMsg.isPending;
  const canSend = (draft.trim().length > 0 || !!pending) && !isBusy;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });

  const isOptimistic = (msg: ChatMsg) => msg.id < 0;

  return (
    <>
      <Stack.Screen options={{ title: teacherName }} />

      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, { backgroundColor: c.background }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.navy} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages ?? []}
            keyExtractor={(m) => String(m.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 6 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMe = item.senderType === 'student';
              const opacity = isOptimistic(item) ? 0.6 : 1;
              return (
                <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
                  {isMe ? (
                    <View style={[styles.bubble, styles.bubbleMe, { backgroundColor: colors.navy, opacity }]}>
                      {item.attachmentUrl && (
                        <AttachmentBubble url={item.attachmentUrl} type={item.attachmentType} name={item.attachmentName} textColor="#fff" />
                      )}
                      {item.text ? (
                        <Text style={[styles.msgText, { color: '#fff' }]}>{item.text}</Text>
                      ) : null}
                      <Text style={[styles.timeText, { color: 'rgba(255,255,255,0.5)' }]}>
                        {isOptimistic(item) ? '...' : formatTime(item.createdAt)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.bubble, styles.bubbleThem, { backgroundColor: c.card, borderColor: c.border }]}>
                      <View style={styles.senderRow}>
                        <Ionicons name="person-circle" size={13} color={colors.gold} />
                        <Text style={[styles.senderName, { color: colors.gold }]}>
                          {item.senderType === 'assistant'
                            ? `مساعد الأستاذ ${item.senderName ?? teacherName}`
                            : `الأستاذ ${item.senderName ?? teacherName}`}
                        </Text>
                      </View>
                      {item.attachmentUrl && (
                        <AttachmentBubble url={item.attachmentUrl} type={item.attachmentType} name={item.attachmentName} textColor={c.foreground} />
                      )}
                      {item.text ? (
                        <Text style={[styles.msgText, { color: c.foreground }]}>{item.text}</Text>
                      ) : null}
                      <Text style={[styles.timeText, { color: c.mutedForeground }]}>
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={52} color={c.mutedForeground} />
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs, textAlign: 'center' }]}>
                  ابدأ محادثتك مع{'\n'}{teacherName}
                </Text>
              </View>
            }
          />
        )}

        {/* معاينة المرفق */}
        {pending && (
          <View style={[styles.pendingBar, { backgroundColor: c.muted, borderTopColor: c.border }]}>
            {pending.kind === 'image'
              ? <Image source={{ uri: pending.uri }} style={styles.pendingThumb} resizeMode="cover" />
              : <Ionicons name="document" size={28} color={colors.navy} />}
            <Text style={[{ flex: 1, color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]} numberOfLines={1}>
              {pending.name}
            </Text>
            <TouchableOpacity onPress={() => setPending(null)}>
              <Ionicons name="close-circle" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* شريط الإدخال */}
        <View style={[styles.inputBar, {
          borderTopColor: c.border,
          backgroundColor: c.background,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8),
        }]}>
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, { backgroundColor: colors.navy, opacity: canSend ? 1 : 0.35 }]}
            disabled={!canSend}
          >
            {isBusy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="اكتب رسالتك..."
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, {
              color: c.foreground,
              backgroundColor: c.card,
              borderColor: c.border,
              fontFamily: 'Tajawal_400Regular',
              fontSize: 14 * fs,
            }]}
            multiline
            textAlign="right"
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity onPress={pickFile} style={styles.attachBtn}>
            <Ionicons name="attach" size={22} color={c.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
            <Ionicons name="image-outline" size={22} color={c.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 60 },
  row: { flexDirection: 'row' },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 20, padding: 12, gap: 5 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4, borderWidth: 1 },
  senderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  senderName: { fontFamily: 'Tajawal_700Bold', fontSize: 11 },
  msgText: { fontFamily: 'Tajawal_400Regular', fontSize: 14, lineHeight: 22, textAlign: 'right' },
  timeText: { fontSize: 10, textAlign: 'right', fontFamily: 'Tajawal_400Regular' },
  attachImg: { width: 180, height: 140, borderRadius: 14 },
  fileChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  pendingBar: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderTopWidth: 1,
  },
  pendingThumb: { width: 48, height: 48, borderRadius: 12 },
  inputBar: {
    flexDirection: 'row-reverse', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingTop: 10, borderTopWidth: 1, gap: 6,
  },
  input: {
    flex: 1, borderRadius: 28, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 110,
  },
  attachBtn: { padding: 4, paddingBottom: 8 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
});
