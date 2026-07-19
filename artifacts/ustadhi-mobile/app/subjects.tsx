import React from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGetSubjects } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';

const SUBJECT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export default function SubjectsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;

  const { data: subjects, isLoading } = useGetSubjects();

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const accent = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    return (
      <TouchableOpacity
        onPress={() => router.push(`/subject/${item.id}`)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
      >
        <View style={[styles.iconWrap, { backgroundColor: accent + '20' }]}>
          {item.icon ? (
            <Text style={styles.iconEmoji}>{item.icon}</Text>
          ) : (
            <Ionicons name="book-outline" size={28} color={accent} />
          )}
        </View>
        <Text style={[styles.name, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.gradeLevel ? (
          <Text style={[styles.grade, { color: accent, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]} numberOfLines={1}>
            {item.gradeLevel}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>جاري التحميل...</Text>
        </View>
      ) : (
        <FlatList
          data={subjects ?? []}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.list, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}>
                لا توجد مواد دراسية
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  row: { gap: 12, flexDirection: 'row-reverse' },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    minHeight: 130,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 28 },
  name: { textAlign: 'center' },
  grade: { textAlign: 'center' },
  emptyWrap: { alignItems: 'center', gap: 12, marginTop: 80 },
  emptyText: { textAlign: 'center' },
});
