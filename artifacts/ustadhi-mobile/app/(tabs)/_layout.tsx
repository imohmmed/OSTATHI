import React from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import colors from '@/constants/colors';

const TAB_ACTIVE   = colors.gold;
const TAB_INACTIVE = 'rgba(255,255,255,0.45)';

// ─── iOS 26+ Liquid Glass ───────────────────────────────────────────
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

// ─── Classic Floating Tab Layout (Android / Web / iOS < 26) ────────
function ClassicTabLayout({ isTeacher, isAdmin }: { isTeacher: boolean; isAdmin: boolean }) {
  // على الـ web نستخدم tabBarStyle عادي — الـ floating مخصص لـ Android فقط
  const useFloating = Platform.OS === 'android';

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: TAB_ACTIVE,
    tabBarInactiveTintColor: TAB_INACTIVE,
    tabBarLabelStyle: {
      fontFamily: 'Tajawal_500Medium',
      fontSize: 11,
    },
    // نخفي الـ tab bar الافتراضي عند استخدام الـ floating
    ...(useFloating
      ? {
          tabBarStyle: { display: 'none' as const },
        }
      : {
          tabBarStyle: {
            position: 'absolute' as const,
            backgroundColor: colors.navy,
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            ...(Platform.OS === 'web' ? { height: 64 } : {}),
          },
        }),
  };

  return (
    <Tabs
      screenOptions={{
        ...screenOptions,
        // مسافة للمحتوى حتى لا يختبئ تحت التاب بار العائم
        ...(useFloating ? { contentStyle: { paddingBottom: 90 } } : {}),
      }}
      // الـ tabBar المخصص — يعمل فقط على Android
      tabBar={useFloating ? (props) => <FloatingTabBar {...props} /> : undefined}
    >
      {/*
        RTL: أول تاب في الكود → يظهر على اليمين
        الترتيب المطلوب (يمين→يسار): الرئيسية | كورساتي | التواصل | طلابي | الإعدادات
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
          title: isAdmin ? 'المواد' : 'كورساتي',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? (isAdmin ? 'library' : 'book') : (isAdmin ? 'library-outline' : 'book-outline')}
              size={22}
              color={color}
            />
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
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout isTeacher={isTeacher} />;
  }
  return <ClassicTabLayout isTeacher={isTeacher} isAdmin={isAdmin} />;
}
