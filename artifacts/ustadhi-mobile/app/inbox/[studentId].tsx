/**
 * صفحة رد الأستاذ على رسائل طالب معين
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherInbox, useReplyMessage } from '@/hooks/useMessages';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';

export default function InboxStudentPage() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const c = useColors();
  const fs = fontScale;
  const qc = useQueryClient();

  const params = useLocalSearchParams<{ studentId: string; studentName: string }>();
  const studentId = Number(params.studentId);
  const studentName = decodeURIComponent(params.studentName ?? 'الطالب');

  const [draft, setDraft] = useState('');

  const { data: allMessages, isLoading } = useTeacherInbox(user?.id);
  const replyMsg = useReplyMessage();

  const messages = (allMessages ?? []).filter((m) => m.fromStudentId === studentId);
  const latestUnrepliedId = [...messages].reverse().find((m) => !m.replyText)?.id;

  const handleReply = () => {
    if (!draft.trim() || !latestUnrepliedId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    replyMsg.mutate(
      { messageId: latestUnrepliedId, replyText: draft.trim() },
      {
        onSuccess: () => {
          setDraft('');
          qc.invalidateQueries({ queryKey: ['teacher-inbox', user?.id] });
        },
      },
    );
  };

  return (
    <>
      {/* ضبط عنوان الهيدر ديناميكياً باسم الطالب */}
      <Stack.Screen options={{ title: studentName }} />

      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, { backgroundColor: c.background }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        {/* ── المحادثة ─── */}
        {isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={colors.navy} />
          </View>
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
                  <View style={styles.msgLabel}>
                    <Ionicons name="person-outline" size={13} color={c.mutedForeground} />
                    <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 11 * fs }]}>
                      {studentName}
                    </Text>
                  </View>
                  <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 22 }]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.bubbleTime, { color: c.mutedForeground }]}>
                    {new Date(item.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* ردّي */}
                {item.replyText ? (
                  <View style={[styles.bubbleMe, { backgroundColor: colors.navy }]}>
                    <View style={styles.msgLabel}>
                      <Ionicons name="person-circle" size={13} color={colors.gold} />
                      <Text style={[{ color: colors.gold, fontFamily: 'Tajawal_600SemiBold', fontSize: 11 * fs }]}>
                        ردّي
                      </Text>
                    </View>
                    <Text style={[{ color: '#fff', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 22 }]}>
                      {item.replyText}
                    </Text>
                    {item.repliedAt && (
                      <Text style={[styles.bubbleTime, { color: 'rgba(255,255,255,0.45)' }]}>
                        {new Date(item.repliedAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={[styles.pendingRow, { backgroundColor: `${colors.gold}22` }]}>
                    <Ionicons name="ellipse" size={7} color={colors.gold} />
                    <Text style={[{ color: colors.gold, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                      لم يُردّ بعد
                    </Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={48} color={c.mutedForeground} />
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                  لا توجد رسائل من هذا الطالب
                </Text>
              </View>
            }
          />
        )}

        {/* ── خانة الرد ─── */}
        {latestUnrepliedId ? (
          <View
            style={[
              styles.inputBar,
              {
                borderTopColor: c.border,
                backgroundColor: c.background,
                paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8),
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleReply}
              style={[styles.sendBtn, { backgroundColor: colors.navy, opacity: draft.trim() ? 1 : 0.35 }]}
              disabled={!draft.trim() || replyMsg.isPending}
            >
              {replyMsg.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="اكتب ردك على الطالب..."
              placeholderTextColor={c.mutedForeground}
              style={[
                styles.input,
                {
                  color: c.foreground,
                  backgroundColor: c.card,
                  borderColor: c.border,
                  fontFamily: 'Tajawal_400Regular',
                  fontSize: 14 * fs,
                },
              ]}
              multiline
              textAlign="right"
            />
          </View>
        ) : (
          <View style={[styles.allReplied, { backgroundColor: c.muted, borderTopColor: c.border }]}>
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
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleThem: {
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  bubbleMe: {
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
    alignSelf: 'flex-end',
  },
  msgLabel: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
    fontFamily: 'Tajawal_400Regular',
  },
  pendingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyChat: { alignItems: 'center', gap: 10, marginTop: 60 },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 110,
  },
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
