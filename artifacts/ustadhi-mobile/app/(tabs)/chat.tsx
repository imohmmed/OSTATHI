import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherCard } from '@/components/TeacherCard';
import { SkeletonRow } from '@/components/SkeletonLoader';
import { useGetTeachers } from '@workspace/api-client-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: number;
}

const MSGS_KEY = (teacherId: number) => `@ustadhi_chat_${teacherId}`;

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedTeacherName, setSelectedTeacherName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: teachers, isLoading } = useGetTeachers();

  useEffect(() => {
    if (selectedTeacherId !== null) {
      AsyncStorage.getItem(MSGS_KEY(selectedTeacherId)).then((raw) => {
        if (raw) setMessages(JSON.parse(raw));
        else setMessages([]);
      });
    }
  }, [selectedTeacherId]);

  const saveMessages = async (msgs: Message[]) => {
    if (selectedTeacherId !== null) {
      await AsyncStorage.setItem(MSGS_KEY(selectedTeacherId), JSON.stringify(msgs));
    }
  };

  const sendMessage = () => {
    if (!draft.trim() || selectedTeacherId === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: Message = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      text: draft.trim(),
      fromMe: true,
      timestamp: Date.now(),
    };
    const updated = [newMsg, ...messages];
    setMessages(updated);
    saveMessages(updated);
    setDraft('');
    // Simulate assistant reply after 2s
    setTimeout(() => {
      const reply: Message = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        text: 'شكراً لتواصلك. سيرد عليك المساعد قريباً إن شاء الله.',
        fromMe: false,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [reply, ...prev];
        saveMessages(next);
        return next;
      });
    }, 2000);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  if (selectedTeacherId !== null) {
    return (
      <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Chat header */}
        <View style={[styles.chatHeader, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={() => setSelectedTeacherId(null)}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-forward" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatTeacherName, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
              {selectedTeacherName}
            </Text>
            <Text style={[styles.chatSubtitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
              يرد المساعد عادةً خلال دقائق
            </Text>
          </View>
        </View>

        {/* Messages (inverted FlatList) */}
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.fromMe
                  ? [styles.bubbleMe, { backgroundColor: colors.primary }]
                  : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border }],
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  {
                    color: item.fromMe ? colors.primaryForeground : colors.foreground,
                    fontFamily: 'Tajawal_400Regular',
                    fontSize: 14 * fs,
                  },
                ]}
              >
                {item.text}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                ابدأ محادثتك مع المساعد
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View
          style={[
            styles.inputBar,
            { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) },
          ]}
        >
          <TouchableOpacity
            onPress={sendMessage}
            style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.4 }]}
          >
            <Ionicons name="send" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="اكتب رسالتك..."
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
                fontFamily: 'Tajawal_400Regular',
                fontSize: 14 * fs,
              },
            ]}
            multiline
            textAlign="right"
            onSubmitEditing={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          التواصل
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
        اختر الأستاذ للتواصل معه عبر مساعده
      </Text>
      <FlatList
        data={teachers ?? []}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => (
          <TeacherCard
            fullName={item.fullName}
            bio={item.bio}
            avatarUrl={item.avatarUrl}
            onPress={() => {
              setSelectedTeacherId(item.id);
              setSelectedTeacherName(item.fullName);
            }}
          />
        )}
        ListHeaderComponent={
          isLoading ? (
            <>
              {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
            </>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
                لا يوجد أساتذة حالياً
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  screenTitle: {},
  subtitle: { padding: 14, paddingTop: 10, textAlign: 'right' },
  chatHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  chatHeaderInfo: { flex: 1 },
  chatTeacherName: { textAlign: 'right' },
  chatSubtitle: { textAlign: 'right' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 6,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { lineHeight: 20 },
  emptyChat: { alignItems: 'center', gap: 10, marginTop: 40 },
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
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: { alignItems: 'center', gap: 10, marginTop: 40 },
  emptyText: { textAlign: 'center' },
});
