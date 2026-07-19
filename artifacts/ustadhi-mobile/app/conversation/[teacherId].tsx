/**
 * صفحة محادثة الطالب مع أستاذ معين
 * - إرسال نص + صورة + ملف
 * - عرض من رد: الأستاذ / مساعد الأستاذ
 */
import React, { useState, useCallback } from 'react';
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
import { useStudentConversation, useSendMessage, uploadAttachment, type ApiMessage } from '@/hooks/useMessages';
import colors from '@/constants/colors';

// ─── نوع المرفق المعلّق ────────────────────────────────
interface PendingAttachment {
  uri: string;
  name: string;
  type: string;  // mime type
  kind: 'image' | 'file';
}

// ─── مكوّن فقاعة المرفق ───────────────────────────────
function AttachmentBubble({
  url, type, name, textColor,
}: { url: string; type?: string | null; name?: string | null; textColor: string }) {
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
      <Text style={[{ color: textColor, fontFamily: 'Tajawal_400Regular', fontSize: 12 }]} numberOfLines={1}>
        {name ?? 'ملف مرفق'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── لون تسمية المستجيب ───────────────────────────────
function replierLabel(msg: ApiMessage, teacherName: string) {
  if (!msg.replierType) return `الأستاذ ${teacherName}`;
  if (msg.replierType === 'assistant') return `مساعد الأستاذ ${msg.replierName ?? teacherName}`;
  return `الأستاذ ${msg.replierName ?? teacherName}`;
}

export default function ConversationPage() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const c = useColors();
  const fs = fontScale;

  const params = useLocalSearchParams<{ teacherId: string; teacherName: string }>();
  const teacherId = Number(params.teacherId);
  const teacherName = decodeURIComponent(params.teacherName ?? 'الأستاذ');

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: messages, isLoading } = useStudentConversation(user?.id, teacherId);
  const sendMsg = useSendMessage();

  // ── اختيار صورة ───────────────────────────────────────
  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('الإذن مرفوض', 'يرجى السماح بالوصول إلى الصور من الإعدادات');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
      setPending({ uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg', kind: 'image' });
    }
  }, []);

  // ── اختيار ملف ────────────────────────────────────────
  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPending({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream', kind: 'file' });
    }
  }, []);

  // ── إرسال ─────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if ((!draft.trim() && !pending) || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;
    let attachmentName: string | undefined;

    if (pending) {
      setUploading(true);
      try {
        const res = await uploadAttachment(pending.uri, pending.name, pending.type);
        attachmentUrl = res.url;
        attachmentType = res.type;
        attachmentName = res.name;
      } catch {
        Alert.alert('خطأ', 'فشل رفع الملف، حاول مجدداً');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    sendMsg.mutate(
      {
        fromStudentId: user.id,
        toTeacherId: teacherId,
        text: draft.trim() || (pending ? `أرسل ${pending.kind === 'image' ? 'صورة' : 'ملفاً'}` : ''),
        attachmentUrl,
        attachmentType,
        attachmentName,
      },
      { onSuccess: () => { setDraft(''); setPending(null); } },
    );
  }, [draft, pending, user, teacherId, sendMsg]);

  const isBusy = uploading || sendMsg.isPending;
  const canSend = (draft.trim().length > 0 || !!pending) && !isBusy;

  return (
    <>
      <Stack.Screen options={{ title: teacherName }} />

      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, { backgroundColor: c.background }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        {/* ── رسائل ─── */}
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.navy} /></View>
        ) : (
          <FlatList
            data={messages ?? []}
            inverted
            keyExtractor={(m) => String(m.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 12 }}>
                {/* رسالة الطالب */}
                <View style={[styles.bubbleMe, { backgroundColor: colors.navy }]}>
                  {item.attachmentUrl && (
                    <AttachmentBubble
                      url={item.attachmentUrl}
                      type={item.attachmentType}
                      name={item.attachmentName}
                      textColor="#fff"
                    />
                  )}
                  {item.text && (
                    <Text style={[{ color: '#fff', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 22 }]}>
                      {item.text}
                    </Text>
                  )}
                  <Text style={[styles.timeText, { color: 'rgba(255,255,255,0.45)' }]}>
                    {new Date(item.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* رد الأستاذ أو المساعد */}
                {item.replyText ? (
                  <View style={[styles.bubbleThem, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={styles.replierRow}>
                      <Ionicons name="person-circle" size={14} color={colors.gold} />
                      <Text style={[{ color: colors.gold, fontFamily: 'Tajawal_600SemiBold', fontSize: 11 * fs }]}>
                        {replierLabel(item, teacherName)}
                      </Text>
                    </View>
                    {item.replyAttachmentUrl && (
                      <AttachmentBubble
                        url={item.replyAttachmentUrl}
                        type={item.replyAttachmentType}
                        name={item.replyAttachmentName}
                        textColor={c.foreground}
                      />
                    )}
                    {item.replyText && (
                      <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 22 }]}>
                        {item.replyText}
                      </Text>
                    )}
                    {item.repliedAt && (
                      <Text style={[styles.timeText, { color: c.mutedForeground }]}>
                        {new Date(item.repliedAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={[styles.awaitingRow, { backgroundColor: c.muted }]}>
                    <Ionicons name="time-outline" size={12} color={c.mutedForeground} />
                    <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                      في انتظار الرد
                    </Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={48} color={c.mutedForeground} />
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
                  ابدأ محادثتك مع {teacherName}
                </Text>
              </View>
            }
          />
        )}

        {/* ── معاينة المرفق المعلّق ─── */}
        {pending && (
          <View style={[styles.pendingBar, { backgroundColor: c.muted, borderTopColor: c.border }]}>
            {pending.kind === 'image' ? (
              <Image source={{ uri: pending.uri }} style={styles.pendingThumb} resizeMode="cover" />
            ) : (
              <Ionicons name="document" size={28} color={colors.navy} />
            )}
            <Text style={[{ flex: 1, color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, textAlign: 'right' }]} numberOfLines={1}>
              {pending.name}
            </Text>
            <TouchableOpacity onPress={() => setPending(null)}>
              <Ionicons name="close-circle" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── شريط الإدخال ─── */}
        <View style={[styles.inputBar, {
          borderTopColor: c.border,
          backgroundColor: c.background,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8),
        }]}>
          {/* زر الإرسال */}
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, { backgroundColor: colors.navy, opacity: canSend ? 1 : 0.35 }]}
            disabled={!canSend}
          >
            {isBusy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>

          {/* حقل الكتابة */}
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
          />

          {/* أزرار المرفقات */}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40 },
  bubbleMe: {
    maxWidth: '82%',
    borderRadius: 24,
    borderBottomRightRadius: 4,
    padding: 12,
    marginBottom: 4,
    alignSelf: 'flex-end',
    gap: 6,
  },
  bubbleThem: {
    maxWidth: '82%',
    borderRadius: 24,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  replierRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    textAlign: 'right',
    fontFamily: 'Tajawal_400Regular',
  },
  awaitingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    marginTop: 2,
  },
  attachImg: {
    width: 180,
    height: 140,
    borderRadius: 18,
  },
  fileChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pendingBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
  },
  pendingThumb: { width: 48, height: 48, borderRadius: 14 },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  input: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 110,
  },
  attachBtn: { padding: 4, paddingBottom: 8 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
