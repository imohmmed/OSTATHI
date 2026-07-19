import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

interface TeacherCardProps {
  fullName: string;
  bio?: string;
  avatarUrl?: string | null;
  subjectName?: string;
  isHorizontal?: boolean;
  onPress: () => void;
}

export function TeacherCard({ fullName, bio, avatarUrl, subjectName, isHorizontal, onPress }: TeacherCardProps) {
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

  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  if (isHorizontal) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={[styles.hCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.initials, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold' }]}>{initials}</Text>
          </View>
          <Text style={[styles.hName, { color: colors.foreground, fontFamily: 'Tajawal_700Bold' }]} numberOfLines={1}>
            {fullName}
          </Text>
          {subjectName && (
            <Text style={[styles.hSubject, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]} numberOfLines={1}>
              {subjectName}
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
        <View style={[styles.avatarLg, { backgroundColor: colors.primary }]}>
          <Text style={[styles.initialsLg, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold' }]}>{initials}</Text>
        </View>
        <View style={styles.vInfo}>
          <Text style={[styles.vName, { color: colors.foreground, fontFamily: 'Tajawal_700Bold' }]}>{fullName}</Text>
          {bio ? (
            <Text style={[styles.vBio, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]} numberOfLines={2}>
              {bio}
            </Text>
          ) : null}
          {subjectName && (
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Tajawal_500Medium' }]}>{subjectName}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hCard: {
    width: 130,
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginLeft: 12,
    gap: 6,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 18 },
  hName: { fontSize: 12, textAlign: 'center' },
  hSubject: { fontSize: 11, textAlign: 'center' },
  vCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  avatarLg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initialsLg: { fontSize: 20 },
  vInfo: { flex: 1, gap: 4 },
  vName: { fontSize: 15, textAlign: 'right' },
  vBio: { fontSize: 12, lineHeight: 18, textAlign: 'right' },
  badge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 2,
  },
  badgeText: { fontSize: 11 },
});
