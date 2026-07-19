import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

type LessonType = 'video' | 'pdf' | 'quiz' | 'assignment' | 'link' | 'livestream' | 'feedback';

const TYPE_CONFIG: Record<LessonType, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  video: { icon: 'play-circle', label: 'فيديو', color: '#3b82f6' },
  pdf: { icon: 'document-text', label: 'PDF', color: '#ef4444' },
  quiz: { icon: 'help-circle', label: 'اختبار', color: '#f59e0b' },
  assignment: { icon: 'create', label: 'واجب', color: '#8b5cf6' },
  link: { icon: 'link', label: 'رابط', color: '#10b981' },
  livestream: { icon: 'radio', label: 'بث مباشر', color: '#ec4899' },
  feedback: { icon: 'chatbubble', label: 'تقييم', color: '#06b6d4' },
};

interface LessonStepItemProps {
  title: string;
  type: LessonType;
  order: number;
  isCompleted?: boolean;
  isLocked?: boolean;
  duration?: number | null;
  onPress: () => void;
}

export function LessonStepItem({ title, type, order, isCompleted, isLocked, duration, onPress }: LessonStepItemProps) {
  const colors = useColors();
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.video;

  const handlePress = () => {
    if (isLocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={isLocked ? 1 : 0.75}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: isCompleted ? colors.success : colors.border,
          opacity: isLocked ? 0.5 : 1,
        },
      ]}
    >
      {/* Step number circle */}
      <View style={[styles.stepCircle, { backgroundColor: isCompleted ? colors.success : colors.primary }]}>
        {isCompleted ? (
          <Ionicons name="checkmark" size={14} color="#fff" />
        ) : (
          <Text style={[styles.stepNum, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold' }]}>
            {order}
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Tajawal_500Medium' }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.typeBadge, { backgroundColor: cfg.color + '20' }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.typeLabel, { color: cfg.color, fontFamily: 'Tajawal_400Regular' }]}>
              {cfg.label}
            </Text>
          </View>
          {duration && (
            <Text style={[styles.duration, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
              {Math.floor(duration / 60)} دقيقة
            </Text>
          )}
        </View>
      </View>

      {isLocked ? (
        <Ionicons name="lock-closed" size={16} color={colors.mutedForeground} />
      ) : (
        <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: { fontSize: 13 },
  content: { flex: 1, gap: 6 },
  title: { fontSize: 14, textAlign: 'right', lineHeight: 20 },
  meta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  typeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeLabel: { fontSize: 11 },
  duration: { fontSize: 11 },
});
