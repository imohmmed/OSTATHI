import React from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import colors from '@/constants/colors';

const TAB_ACTIVE   = colors.gold;
const TAB_INACTIVE = 'rgba(255,255,255,0.45)';

// ─── تعريف هيكل التابات لكل دور ──────────────────────────────────────
//
//  | route    | student | teacher | assistant | parent | admin        |
//  |----------|---------|---------|-----------|--------|--------------|
//  | index    |   ✅    |   ✅    |    ✅     |   ✅   |   ✅        |
//  | courses  |   ✅    |   ✅    |    ✅     |   ❌   | ✅ المقررات |
//  | chat     |   ✅    |   ✅    |    ✅     |   ✅   |   ✅        |
//  | students |   ❌    | ✅ طلابي| ✅ طلابي  |✅أبنائي|✅ المستخدمين|
//  | settings |   ✅    |   ✅    |    ✅     |   ✅   |   ✅        |

interface TabConfig {
  title: string;
  href: null | undefined; // null = مخفي، undefined = ظاهر
  iconActive: string;
  iconInactive: string;
  sfDefault?: string;
  sfSelected?: string;
}

type TabsConfig = Record<'index' | 'courses' | 'chat' | 'students' | 'settings', TabConfig>;

function getTabsConfig(role: UserRole): TabsConfig {
  const common = {
    index: {
      title: 'الرئيسية',
      href: undefined,
      iconActive: 'home',
      iconInactive: 'home-outline',
      sfDefault: 'house',
      sfSelected: 'house.fill',
    },
    chat: {
      title: 'التواصل',
      href: undefined,
      iconActive: 'chatbubble-ellipses',
      iconInactive: 'chatbubble-ellipses-outline',
      sfDefault: 'bubble.left',
      sfSelected: 'bubble.left.fill',
    },
    settings: {
      title: 'الإعدادات',
      href: undefined,
      iconActive: 'settings',
      iconInactive: 'settings-outline',
      sfDefault: 'gearshape',
      sfSelected: 'gearshape.fill',
    },
  } as const;

  switch (role) {
    case 'student':
      return {
        ...common,
        courses: {
          title: 'كورساتي',
          href: undefined,
          iconActive: 'book',
          iconInactive: 'book-outline',
          sfDefault: 'book',
          sfSelected: 'book.fill',
        },
        students: {
          title: 'طلابي',
          href: null,
          iconActive: 'people',
          iconInactive: 'people-outline',
        },
      };

    case 'teacher':
      return {
        ...common,
        courses: {
          title: 'كورساتي',
          href: undefined,
          iconActive: 'book',
          iconInactive: 'book-outline',
          sfDefault: 'book',
          sfSelected: 'book.fill',
        },
        students: {
          title: 'طلابي',
          href: undefined,
          iconActive: 'people',
          iconInactive: 'people-outline',
          sfDefault: 'person.2',
          sfSelected: 'person.2.fill',
        },
      };

    case 'assistant':
      return {
        ...common,
        courses: {
          title: 'كورساتي',
          href: undefined,
          iconActive: 'book',
          iconInactive: 'book-outline',
          sfDefault: 'book',
          sfSelected: 'book.fill',
        },
        students: {
          title: 'طلابي',
          href: undefined,
          iconActive: 'people',
          iconInactive: 'people-outline',
          sfDefault: 'person.2',
          sfSelected: 'person.2.fill',
        },
      };

    case 'parent':
      return {
        ...common,
        courses: {
          title: 'كورساتي',
          href: null, // ولي الأمر لا يرى المقررات مباشرةً
          iconActive: 'book',
          iconInactive: 'book-outline',
        },
        students: {
          title: 'أبنائي',
          href: undefined,
          iconActive: 'heart',
          iconInactive: 'heart-outline',
          sfDefault: 'heart',
          sfSelected: 'heart.fill',
        },
      };

    case 'admin':
      return {
        ...common,
        courses: {
          title: 'المقررات',
          href: undefined,
          iconActive: 'library',
          iconInactive: 'library-outline',
          sfDefault: 'books.vertical',
          sfSelected: 'books.vertical.fill',
        },
        students: {
          title: 'المستخدمين',
          href: undefined,
          iconActive: 'people-circle',
          iconInactive: 'people-circle-outline',
          sfDefault: 'person.3',
          sfSelected: 'person.3.fill',
        },
      };

    default:
      return getTabsConfig('student');
  }
}

// ─── iOS 26+ Liquid Glass ────────────────────────────────────────────
function NativeTabLayout({ role }: { role: UserRole }) {
  const cfg = getTabsConfig(role);

  // ترتيب RTL: يمين → يسار (أول عنصر = اليمين في Liquid Glass)
  // نستخدم as any لتجاوز قيود نوع SFSymbols7_0 الصارمة
  return (
    <NativeTabs>
      {/* الإعدادات - أقصى اليمين */}
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: (cfg.settings.sfDefault ?? 'gearshape') as any, selected: (cfg.settings.sfSelected ?? 'gearshape.fill') as any }} />
        <Label>{cfg.settings.title}</Label>
      </NativeTabs.Trigger>

      {/* طلابي / أبنائي / المستخدمين */}
      {cfg.students.href !== null ? (
        <NativeTabs.Trigger name="students">
          <Icon sf={{ default: (cfg.students.sfDefault ?? 'person.2') as any, selected: (cfg.students.sfSelected ?? 'person.2.fill') as any }} />
          <Label>{cfg.students.title}</Label>
        </NativeTabs.Trigger>
      ) : null}

      {/* التواصل */}
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: (cfg.chat.sfDefault ?? 'bubble.left') as any, selected: (cfg.chat.sfSelected ?? 'bubble.left.fill') as any }} />
        <Label>{cfg.chat.title}</Label>
      </NativeTabs.Trigger>

      {/* كورساتي / المقررات */}
      {cfg.courses.href !== null ? (
        <NativeTabs.Trigger name="courses">
          <Icon sf={{ default: (cfg.courses.sfDefault ?? 'book') as any, selected: (cfg.courses.sfSelected ?? 'book.fill') as any }} />
          <Label>{cfg.courses.title}</Label>
        </NativeTabs.Trigger>
      ) : null}

      {/* الرئيسية - أقصى اليسار */}
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: (cfg.index.sfDefault ?? 'house') as any, selected: (cfg.index.sfSelected ?? 'house.fill') as any }} />
        <Label>{cfg.index.title}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Classic / Floating Tab Layout (Android / Web / iOS < 26) ───────
function ClassicTabLayout({ role }: { role: UserRole }) {
  const cfg = getTabsConfig(role);
  const useFloating = Platform.OS === 'android';

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: TAB_ACTIVE,
    tabBarInactiveTintColor: TAB_INACTIVE,
    tabBarLabelStyle: {
      fontFamily: 'Tajawal_500Medium',
      fontSize: 11,
    },
    ...(useFloating
      ? { tabBarStyle: { display: 'none' as const } }
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
        ...(useFloating ? { contentStyle: { paddingBottom: 90 } } : {}),
      }}
      tabBar={useFloating ? (props) => <FloatingTabBar {...props} /> : undefined}
    >
      {/*
        ترتيب RTL (يمين → يسار): الرئيسية | كورساتي | التواصل | طلابي | الإعدادات
        أول تاب في الكود = يمين الشاشة
      */}
      <Tabs.Screen
        name="index"
        options={{
          title: cfg.index.title,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? cfg.index.iconActive : cfg.index.iconInactive) as any}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: cfg.courses.title,
          href: cfg.courses.href,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? cfg.courses.iconActive : cfg.courses.iconInactive) as any}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: cfg.chat.title,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? cfg.chat.iconActive : cfg.chat.iconInactive) as any}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: cfg.students.title,
          href: cfg.students.href,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? cfg.students.iconActive : cfg.students.iconInactive) as any}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: cfg.settings.title,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? cfg.settings.iconActive : cfg.settings.iconInactive) as any}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Layout الرئيسي ───────────────────────────────────────────────────
export default function TabLayout() {
  const { user } = useAuth();
  const role: UserRole = user?.role ?? 'student';

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout role={role} />;
  }
  return <ClassicTabLayout role={role} />;
}
