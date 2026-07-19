import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import colors from '@/constants/colors';

// ─── ثوابت التاب بار — ثابتة في كلا الوضعين ───────
const TAB_BG       = colors.navy;    // #101D36 دائماً
const TAB_ACTIVE   = colors.gold;    // #D4A843 ذهبي للعنصر النشط
const TAB_INACTIVE = 'rgba(255,255,255,0.45)'; // أبيض شفاف للعناصر غير النشطة

// ─── iOS 26+ Liquid Glass ───────────────────────────
function NativeTabLayout({ isTeacher }: { isTeacher: boolean }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <Label>الإعدادات</Label>
      </NativeTabs.Trigger>
      {isTeacher ? (
        <NativeTabs.Trigger name="students">
          <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
          <Label>طلابي</Label>
        </NativeTabs.Trigger>
      ) : null}
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
        <Label>التواصل</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="courses">
        <Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <Label>كورساتي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Classic Tab Layout (Android / Web / iOS < 26) ──
function ClassicTabLayout({ isTeacher }: { isTeacher: boolean }) {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          // لون صلب #101D36 على جميع المنصات بدون blur
          backgroundColor: TAB_BG,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          ...(Platform.OS === 'web' ? { height: 64 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: 'Tajawal_500Medium',
          fontSize: 11,
        },
        // خلفية صلبة واحدة على كل المنصات — بدون BlurView حتى لا يظهر اللون الأزرق
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: TAB_BG }]} />
        ),
      }}
    >
      {/*
        RTL: أول تاب في الكود → يظهر على اليمين
        المطلوب (يمين → يسار): الرئيسية | كورساتي | التواصل | طلابي | الإعدادات
        ترتيب الكود:            index | courses | chat | students | settings
      */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'كورساتي',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'التواصل',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'طلابي',
          href: isTeacher ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout isTeacher={isTeacher} />;
  }
  return <ClassicTabLayout isTeacher={isTeacher} />;
}
