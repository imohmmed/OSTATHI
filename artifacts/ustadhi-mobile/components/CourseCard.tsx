import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ProgressBar } from './ProgressBar';
import * as Haptics from 'expo-haptics';

interface CourseCardProps {
  title: string;
  teacherName?: string | null;
  subjectName?: string | null;
  lessonsCount?: number;
  progress?: number;
  isHorizontal?: boolean;
  onPress: () => void;
}

export function CourseCard({ title, teacherName, subjectName, lessonsCount, progress, isHorizontal, onPress }: CourseCardProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  if (isHorizontal) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={[styles.hCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.thumbnail, { backgroundColor: colors.primary }]}>
            <Ionicons name="book" size={28} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.hTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold' }]} numberOfLines={2}>
            {title}
          </Text>
          {teacherName && (
            <Text style={[styles.hTeacher, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]} numberOfLines={1}>
              {teacherName}
            </Text>
          )}
          {typeof lessonsCount === 'number' && (
            <Text style={[styles.hLessons, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
              {lessonsCount} محاضرة
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.vCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.vThumbnail, { backgroundColor: colors.primary }]}>
          <Ionicons name="book" size={32} color={colors.primaryForeground} />
          {subjectName && (
            <View style={[styles.subjectBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.subjectText, { fontFamily: 'Tajawal_500Medium' }]}>{subjectName}</Text>
            </View>
          )}
        </View>
        <View style={styles.vBody}>
          <Text style={[styles.vTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold' }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.vMeta}>
            {teacherName && (
              <View style={styles.metaRow}>
                <Ionicons name="person" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
                  {teacherName}
                </Text>
              </View>
            )}
            {typeof lessonsCount === 'number' && (
              <View style={styles.metaRow}>
                <Ionicons name="play-circle" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
                  {lessonsCount} محاضرة
                </Text>
              </View>
            )}
          </View>
          {typeof progress === 'number' && (
            <View style={{ marginTop: 8 }}>
              <ProgressBar progress={progress} showLabel />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hCard: {
    width: 175,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginLeft: 12,
  },
  thumbnail: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hTitle: { fontSize: 13, padding: 10, paddingBottom: 2 },
  hTeacher: { fontSize: 11, paddingHorizontal: 10 },
  hLessons: { fontSize: 11, paddingHorizontal: 10, paddingBottom: 10 },
  vCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  vThumbnail: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  subjectText: { color: '#fff', fontSize: 12 },
  vBody: { padding: 14, gap: 6 },
  vTitle: { fontSize: 16, lineHeight: 24 },
  vMeta: { gap: 4 },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
});
