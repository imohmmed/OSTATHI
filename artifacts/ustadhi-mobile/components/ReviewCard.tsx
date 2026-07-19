import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface ReviewCardProps {
  studentName: string;
  comment: string;
  rating: number;
  createdAt?: string;
}

export function ReviewCard({ studentName, comment, rating, createdAt }: ReviewCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.initial, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold' }]}>
            {studentName[0]}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: 'Tajawal_700Bold' }]}>
            {studentName}
          </Text>
          <View style={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < rating ? 'star' : 'star-outline'}
                size={13}
                color={i < rating ? colors.gold : colors.mutedForeground}
              />
            ))}
          </View>
        </View>
      </View>
      <Text style={[styles.comment, { color: colors.foreground, fontFamily: 'Tajawal_400Regular' }]}>
        {comment}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    marginRight: 12,
    width: 250,
    gap: 10,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 16 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, textAlign: 'right' },
  stars: { flexDirection: 'row-reverse' },
  comment: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
});
