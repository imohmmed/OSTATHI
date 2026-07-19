/**
 * صفحة رد الأستاذ / المساعد على رسائل طالب معين
 * - عرض مرفقات الطالب (صور/ملفات)
 * - إرسال رد بنص أو صورة أو ملف
 * - التمييز بين رد الأستاذ ورد المساعد
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
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherInbox, useReplyMessage, uploadAttachment, type ApiMessage } from '@/hooks/useMessages';
import colors from '@/constants/colors';

interface PendingAttachment {
  uri: string;
  name: string;
  type: string;
  kind: 'image' | 'file';
}

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
      style={[styles.fileChip, { borderColor: 'rgba(255,255,255,0.2)' }]}
    >
      <Ionicons name="document-outline" size={16} color={textColor} />
      <Text style={{ color: textColor, fontFamily: 'Tajawal_400Regular', fontSize: 12 }} numberOfLines={1}>
        {name ?? 'ملف مرفق'}
      </Text>
    </TouchableOpacity>
  );
}

export default function InboxStudentPage() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const c = useColors();
  const fs = fontScale;
  const qc = useQueryClient();

  const params = useLocalSearchParams<{
    studentId: string;
    studentName: string;
    teacherId: string;
    teacherName: string;
  }>();
  const studentId = Number(params.studentId);
  const studentName = decodeURIComponent(params.studentName ?? 'الطالب');
  const teacherId = Number(params.teacherId ?? (user?.role === 'assistant' ? user.teacherId : user?.id));
  const teacherName = decodeURIComponent(params.teacherName ?? (user?.role === 'assistant' ? user.teacherName ?? '' : user?.fullName ?? ''));

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: allMessages, isLoading } = useTeacherInbox(teacherId);
  const replyMsg = useReplyMessage();

  const messages = (allMessages ?? []).filter((m) => m.fromStudentId === studentId);
  const latestUnreplied = [...messages].reverse().find((m) => !m.replyText);

  // من يرد: الأستاذ أو مساعده
  const replierType: 'teacher' | 'assistant' = user?.role === 'assistant' ? 'assistant' : 'teacher';
  const replierName = teacherName; // دائماً اسم الأستاذ (حتى لو المساعد هو من يرد)

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('الإذن مرفوض', 'يرجى السماح بالوصول إلى الصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPending({ uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg', kind: 'image' });
    }
  }, []);

  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPending({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', kind: 'file' });
    }
  }, []);

  const handleReply = useCallback(async () => {
    if (!latestUnreplied || (!draft.trim() && !pending)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let replyAttachmentUrl: string | undefined;
    let replyAttachmentType: string | undefined;
    let replyAttachmentName: string | undefined;

    if (pending) {
      setUploading(true);
      try {
        const res = await uploadAttachment(pending.uri, pending.name, pending.type);
        replyAttachmentUrl = res.url;
        replyAttachmentType = res.type;
        replyAttachmentName = res.name;
      } catch {
        Alert.alert('خطأ', 'فشل رفع الملف، حاول مجدداً');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    replyMsg.mutate(
      {
        messageId: latestUnreplied.id,
        replyText: draft.trim() || (pending ? `أرسل ${pending.kind === 'image' ? 'صورة' : 'ملفاً'}` : ''),
        replierType,
        replierName,
        replyAttachmentUrl,
        replyAttachmentType,
        replyAttachmentName,
      },
      {
        onSuccess: () => {
          setDraft('');
          setPending(null);
          qc.invalidateQueries({ queryKey: ['teacher-inbox', teacherId] });
        },
      },
    );
  }, [draft, pending, latestUnreplied, replierType, replierName, teacherId]);

  const isBusy = uploading || replyMsg.isPending;
  const canReply = (draft.trim().length > 0 || !!pending) && !isBusy && !!latestUnreplied;

  return (
    <>
      <Stack.Screen options={{ title: studentName }} />

      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, { backgroundColor: c.background }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        {/* ── شريط هوية المستجيب ─── */}
        <View style={[styles.replierBar, { backgroundColor: `${colors.gold}18`, borderBottomColor: c.border }]}>
          <Ionicons
            name={user?.role === 'assistant' ? 'person-circle-outline' : 'person-circle'}
            size={16}
            color={colors.gold}
          />
          <Text style={[{ color: colors.gold, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
            {user?.role === 'assistant'
              ? `ترد بصفتك مساعد الأستاذ ${teacherName}`
              : `ترد بصفتك الأستاذ ${teacherName}`}
          </Text>
        </View>

        {/* ── رسائل المحادثة ─── */}
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.navy} /></View>
        ) : (
          <FlatList
            data={[...messages].reverse()}
            inverted
            keyExtractor={(m) => String(m.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 12 }}>
                {/* رسالة الطالب */}
                <View style={[styles.bubbleThem, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <View style={styles.labelRow}>
                    <Ionicons name="person-outline" size={13} color={c.mutedForeground} />
                    <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>
                      {studentName}
                    </Text>
                  </View>
                  {item.attachmentUrl && (
                    <AttachmentBubble
                      url={item.attachmentUrl}
                      type={item.attachmentType}
                      name={item.attachmentName}
                      textColor={c.foreground}
                    />
                  )}
                  <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 22 }]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.timeText, { color: c.mutedForeground }]}>
                    {new Date(item.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* الرد */}
                {item.replyText ? (
                  <View style={[styles.bubbleMe, { backgroundColor: colors.navy }]}>
                    <View style={styles.labelRow}>
                      <Ionicons name="person-circle" size={13} color={colors.gold} />
                      <Text style={[{ color: colors.gold, fontFamily: 'Tajawal_600SemiBold', fontSize: 11 * fs }]}>
                        {item.replierType === 'assistant'
                          ? `مساعد الأستاذ ${item.replierName ?? teacherName}`
                          : `الأستاذ ${item.replierName ?? teacherName}`}
                      </Text>
                    </View>
                    {item.replyAttachmentUrl && (
                      <AttachmentBubble
                        url={item.replyAttachmentUrl}
                        type={item.replyAttachmentType}
                        name={item.replyAttachmentName}
                        textColor="#fff"
                      />
                    )}
                    <Text style={[{ color: '#fff', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 22 }]}>
                      {item.replyText}
                    </Text>
                    {item.repliedAt && (
                      <Text style={[styles.timeText, { color: 'rgba(255,255,255,0.45)' }]}>
                        {new Date(item.repliedAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={[styles.pendingTag, { backgroundColor: `${colors.gold}22` }]}>
                    <Ionicons name="ellipse" size={7} color={colors.gold} />
                    <Text style={[{ color: colors.gold, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                      لم يُردّ بعد
                    </Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={48} color={c.mutedForeground} />
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                  لا توجد رسائل من هذا الطالب
                </Text>
              </View>
            }
          />
        )}

        {/* ── معاينة مرفق الرد ─── */}
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

        {/* ── شريط الإدخال أو رسالة "تم الرد" ─── */}
        {latestUnreplied ? (
          <View style={[styles.inputBar, {
            borderTopColor: c.border,
            backgroundColor: c.background,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8),
          }]}>
            <TouchableOpacity
              onPress={handleReply}
              style={[styles.sendBtn, { backgroundColor: colors.navy, opacity: canReply ? 1 : 0.35 }]}
              disabled={!canReply}
            >
              {isBusy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`اكتب ردك على ${studentName}...`}
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

            <TouchableOpacity onPress={pickFile} style={styles.attachBtn}>
              <Ionicons name="attach" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
              <Ionicons name="image-outline" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.allReplied, {
            backgroundColor: c.muted,
            borderTopColor: c.border,
            paddingBottom: insets.bottom + 8,
          }]}>
            <Ionicons name="checkmark-circle" size={16} color={c.success} />
            <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
              جميع الرسائل مُجاب عليها
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40 },
  replierBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  bubbleThem: {
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 4,
    gap: 6,
  },
  bubbleMe: {
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
    alignSelf: 'flex-end',
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    textAlign: 'right',
    fontFamily: 'Tajawal_400Regular',
  },
  pendingTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 4,
  },
  attachImg: { width: 180, height: 140, borderRadius: 10 },
  fileChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pendingBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
  },
  pendingThumb: { width: 48, height: 48, borderRadius: 8 },
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
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 110,
  },
  attachBtn: { padding: 4, paddingBottom: 8 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allReplied: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    borderTopWidth: 1,
  },
});
