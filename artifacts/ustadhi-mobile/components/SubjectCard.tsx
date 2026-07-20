import React, { useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

interface SubjectCardProps {
  name: string;
  icon?: string | null;
  imageUrl?: string | null;
  gradeLevel: string;
  isSelected?: boolean;
  onPress: () => void;
}

export function SubjectCard({ name, icon, imageUrl, gradeLevel, isSelected, onPress }: SubjectCardProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  if (imageUrl) {
    // Image-only card — photo fills entirely, no text
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.88} style={styles.imageCard}>
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[
          styles.card,
          {
            backgroundColor: isSelected ? colors.primary : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text
          style={[styles.name, { color: isSelected ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_700Bold' }]}
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text
          style={[styles.grade, { color: isSelected ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}
        >
          {gradeLevel}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginLeft: 12,
    gap: 4,
  },
  imageCard: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginLeft: 12,
    overflow: 'hidden',
  },
  icon: { fontSize: 30, marginBottom: 4 },
  name: { fontSize: 13, textAlign: 'center' },
  grade: { fontSize: 11, textAlign: 'center' },
});
