import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import colors from '@/constants/colors';

// Tab bar is always #101D36 regardless of theme
const TAB_BG = colors.navy;         // #101D36
const TAB_ACTIVE = colors.gold;     // #D4A843 — gold
const TAB_INACTIVE = 'rgba(255,255,255,0.45)';

// iOS 26+ liquid glass tabs — defined in forward RTL reading order.
function NativeTabLayout({ isTeacher }: { isTeacher: boolean }) {
  return (
    <NativeTabs>
      {/* Settings — visible for ALL roles */}
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <Label>الإعدادات</Label>
      </NativeTabs.Trigger>
      {/* Students — teachers only */}
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

function ClassicTabLayout({ isTeacher }: { isTeacher: boolean }) {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : TAB_BG,
          borderTopWidth: 0,
          elevation: 0,
          ...(Platform.OS === 'web' ? { height: 64 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: 'Tajawal_500Medium',
          fontSize: 11,
        },
        // Background: solid #101D36 on Android/web; dark blur on iOS
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={95}
              tint="dark"
              style={[StyleSheet.absoluteFill, { backgroundColor: `${TAB_BG}CC` }]}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: TAB_BG }]} />
          ),
      }}
    >
      {/*
        RTL layout flips tab visual order: first tab in code → appears on the RIGHT.
        Desired visual (right → left): الرئيسية | كورساتي | التواصل | طلابي | الإعدادات
        Code order: index | courses | chat | students | settings
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
