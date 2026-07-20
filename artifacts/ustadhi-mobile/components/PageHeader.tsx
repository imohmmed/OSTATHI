/**
 * PageHeader — الهيدر الموحّد لكل صفحات التطبيق
 * زر الرجوع على اليسار، العنوان في المنتصف، خانة اختيارية على اليمين
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  /** لون الخلفية (افتراضي: شفاف / لون الكارت) */
  backgroundColor?: string;
  /** لون النص والأيقونات */
  tintColor?: string;
  /** لون خط الفصل السفلي (undefined = بدون خط) */
  borderColor?: string;
  /** عنصر اختياري في الجانب الأيمن (فلتر، حفظ، ...) */
  right?: React.ReactNode;
}

export function PageHeader({
  title,
  onBack,
  backgroundColor = 'transparent',
  tintColor = '#101D36',
  borderColor,
  right,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 6);

  return (
    <View
      style={[
        sty.wrap,
        {
          paddingTop: topPad,
          backgroundColor,
          borderBottomColor: borderColor ?? 'transparent',
          borderBottomWidth: borderColor ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      {/* ── زر الرجوع — اليسار ── */}
      <TouchableOpacity
        onPress={onBack}
        style={sty.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={22} color={tintColor} />
        <Text style={[sty.backTxt, { color: tintColor }]}>رجوع</Text>
      </TouchableOpacity>

      {/* ── العنوان — المنتصف ── */}
      <Text style={[sty.title, { color: tintColor }]} numberOfLines={1}>
        {title}
      </Text>

      {/* ── الجانب الأيمن ── */}
      <View style={sty.rightSlot}>{right ?? null}</View>
    </View>
  );
}

const sty = StyleSheet.create({
  wrap: {
    // row عادي (ليس row-reverse) حتى يكون زر الرجوع دائماً على اليسار المرئي
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 72,
  },
  backTxt: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 15,
  },
  title: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 17,
    textAlign: 'center',
    flex: 1,
  },
  rightSlot: {
    minWidth: 72,
    alignItems: 'flex-end',
  },
});
