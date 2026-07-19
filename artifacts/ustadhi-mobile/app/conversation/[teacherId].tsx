/**
 * صفحة محادثة الطالب مع أستاذ معين
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
import { useStudentConversation, useSendMessage } from '@/hooks/useMessages';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';

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

  const { data: messages, isLoading } = useStudentConversation(user?.id, teacherId);
  const sendMsg = useSendMessage();

  const handleSend = () => {
    if (!draft.trim() || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMsg.mutate(
      { fromStudentId: user.id, toTeacherId: teacherId, text: draft.trim() },
      { onSuccess: () => setDraft('') },
    );
  };

  return (
    <>
      {/* ضبط عنوان الهيدر ديناميكياً باسم الأستاذ */}
      <Stack.Screen options={{ title: teacherName }} />

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
            data={messages ?? []}
            inverted
            keyExtractor={(m) => String(m.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 10 }}>
                {/* رسالة الطالب */}
                <View style={[styles.bubbleMe, { backgroundColor: colors.navy }]}>
                  <Text style={[{ color: '#fff', fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 22 }]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.bubbleTime, { color: 'rgba(255,255,255,0.5)' }]}>
                    {new Date(item.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* رد الأستاذ */}
                {item.replyText ? (
                  <View style={[styles.bubbleThem, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={styles.replyLabel}>
                      <Ionicons name="person-circle" size={14} color={colors.gold} />
                      <Text style={[{ color: colors.gold, fontFamily: 'Tajawal_600SemiBold', fontSize: 11 * fs }]}>
                        {teacherName}
                      </Text>
                    </View>
                    <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, lineHeight: 22 }]}>
                      {item.replyText}
                    </Text>
                    <Text style={[styles.bubbleTime, { color: c.mutedForeground }]}>
                      {item.repliedAt
                        ? new Date(item.repliedAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.awaitingReply, { backgroundColor: c.muted }]}>
                    <Ionicons name="time-outline" size={12} color={c.mutedForeground} />
                    <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                      في انتظار رد الأستاذ
                    </Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={48} color={c.mutedForeground} />
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
                  ابدأ محادثتك مع الأستاذ
                </Text>
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'center' }]}>
                  اكتب سؤالك وسيرد عليك في أقرب وقت
                </Text>
              </View>
            }
          />
        )}

        {/* ── خانة الكتابة ─── */}
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
            onPress={handleSend}
            style={[styles.sendBtn, { backgroundColor: colors.navy, opacity: draft.trim() ? 1 : 0.35 }]}
            disabled={!draft.trim() || sendMsg.isPending}
          >
            {sendMsg.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="اكتب رسالتك..."
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
            onSubmitEditing={handleSend}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleMe: {
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
    marginBottom: 4,
    alignSelf: 'flex-end',
  },
  bubbleThem: {
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  replyLabel: {
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
  awaitingReply: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 2,
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
});
