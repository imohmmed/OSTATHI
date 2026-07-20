import React, { useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ProgressBar } from './ProgressBar';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32; // 16px each side

interface CourseCardProps {
  title: string;
  teacherName?: string | null;
  teacherAvatarUrl?: string | null;
  subjectName?: string | null;
  gradeLevel?: string | null;
  thumbnailUrl?: string | null;
  lessonsCount?: number;
  progress?: number;
  /** @deprecated use default vertical card now */
  isHorizontal?: boolean;
  onPress: () => void;
}

export function CourseCard({
  title,
  teacherName,
  teacherAvatarUrl,
  subjectName,
  gradeLevel,
  thumbnailUrl,
  lessonsCount,
  progress,
  onPress,
}: CourseCardProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const initials = teacherName
    ? teacherName.split(' ').slice(0, 2).map((w) => w[0]).join('')
    : '؟';

  return (
    <Animated.View style={[{ transform: [{ scale }] }, styles.wrapper]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.88}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* ── Landscape thumbnail ── */}
        <View style={styles.thumbWrapper}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.primary }]}>
              <Ionicons name="book" size={36} color="rgba(255,255,255,0.9)" />
            </View>
          )}
          {/* Subject pill top-right */}
          {subjectName && (
            <View style={[styles.subjectPill, { backgroundColor: 'rgba(16,29,54,0.78)' }]}>
              <Text style={[styles.subjectPillText, { fontFamily: 'Tajawal_500Medium' }]}>
                {subjectName}
              </Text>
            </View>
          )}
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* Course title */}
          <Text
            style={[styles.title, { color: colors.foreground, fontFamily: 'Tajawal_700Bold' }]}
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* Grade level */}
          {gradeLevel && (
            <Text
              style={[styles.grade, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}
            >
              {gradeLevel}
            </Text>
          )}

          {/* Lessons count */}
          {typeof lessonsCount === 'number' && (
            <Text style={[styles.lessonsText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
              {lessonsCount} محاضرة
            </Text>
          )}

          {/* Progress bar (student enrolled view) */}
          {typeof progress === 'number' && (
            <View style={{ marginTop: 6 }}>
              <ProgressBar progress={progress} showLabel />
            </View>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Teacher row */}
          <View style={styles.teacherRow}>
            {/* Avatar */}
            {teacherAvatarUrl ? (
              <Image
                source={{ uri: teacherAvatarUrl }}
                style={[styles.avatar, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarInitials, { fontFamily: 'Tajawal_700Bold' }]}>{initials}</Text>
              </View>
            )}
            {teacherName && (
              <Text
                style={[styles.teacherName, { color: colors.foreground, fontFamily: 'Tajawal_500Medium' }]}
                numberOfLines={1}
              >
                {teacherName}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_W,
    marginHorizontal: 16,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbWrapper: {
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: CARD_W * 0.52, // ~landscape ratio
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  subjectPillText: { color: '#fff', fontSize: 12 },
  body: {
    padding: 14,
    gap: 4,
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'right',
  },
  grade: {
    fontSize: 13,
    textAlign: 'right',
  },
  lessonsText: {
    fontSize: 12,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  teacherRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 13,
  },
  teacherName: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
});
