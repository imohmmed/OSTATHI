import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

// iOS 26+ liquid glass tabs — defined in forward RTL reading order.
// iOS system handles RTL tab placement natively.
function NativeTabLayout({ isTeacher }: { isTeacher: boolean }) {
  return (
    <NativeTabs>
      {isTeacher ? (
        <NativeTabs.Trigger name="students">
          <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
          <Label>طلابي</Label>
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="settings">
          <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
          <Label>الإعدادات</Label>
        </NativeTabs.Trigger>
      )}
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

function ClassicTabLayout({ isTeacher }: { isTeacher: boolean }) {
  const colors = useColors();
  const { effectiveTheme } = useApp();
  const isDark = effectiveTheme === 'dark';
  const isIOS = Platform.OS === 'ios';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(Platform.OS === 'web' ? { height: 64 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: 'Tajawal_500Medium',
          fontSize: 11,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ),
      }}
    >
      {/*
        RTL layout flips tab visual order: first tab in code → appears on the RIGHT.
        Desired visual (right → left): الرئيسية | كورساتي | التواصل | طلابي/الإعدادات
        So code order must be:         index | courses | chat | students/settings
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
          href: isTeacher ? null : undefined,
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
