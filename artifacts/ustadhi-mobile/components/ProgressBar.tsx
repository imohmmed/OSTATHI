import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface ProgressBarProps {
  progress: number; // 0–100
  showLabel?: boolean;
  height?: number;
}

export function ProgressBar({ progress, showLabel = false, height = 8 }: ProgressBarProps) {
  const colors = useColors();
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(100, Math.max(0, progress)),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, width]);

  const widthInterpolated = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular' }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}
      <View style={[styles.track, { backgroundColor: colors.muted, height, borderRadius: height / 2 }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthInterpolated,
              backgroundColor: colors.primary,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
  labelRow: {
    flexDirection: 'row-reverse',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
  },
});
