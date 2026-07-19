import React from 'react';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { TeacherCard } from '@/components/TeacherCard';
import { SkeletonRow } from '@/components/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';
import { useGetTeachers, useGetSubjects } from '@workspace/api-client-react';

export default function SubjectTeachersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = Number(id);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const fs = fontScale;

  const { data: subjects } = useGetSubjects();
  const subject = subjects?.find((s) => s.id === subjectId);

  const { data: teachers, isLoading } = useGetTeachers({ subjectId });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={teachers ?? []}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => (
          <TeacherCard
            fullName={item.fullName}
            bio={item.bio}
            avatarUrl={item.avatarUrl}
            onPress={() => router.push(`/teacher/${item.id}`)}
          />
        )}
        ListHeaderComponent={
          <>
            {isLoading && [1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}>
                لا يوجد أساتذة لهذه المادة حالياً
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 60 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText: { textAlign: 'center' },
});
