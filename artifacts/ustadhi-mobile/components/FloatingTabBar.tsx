/**
 * FloatingTabBar — عائم ومستدير من كل الاتجاهات
 * يُستخدم على Android وأي منصة بدون Liquid Glass
 * يدعم تخصيص الأيقونة والتسمية بحسب دور المستخدم
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/contexts/AuthContext';

const NAV_BG   = '#101D36';
const ACTIVE   = '#D4A843';
const INACTIVE = 'rgba(255,255,255,0.50)';
const PILL_BG  = 'rgba(212,168,67,0.18)';

// ─── خريطة الأيقونات الأساسية (مشتركة بين الأدوار) ──────────────────
type IconEntry = { active: string; inactive: string; label: string };

const BASE_ICONS: Record<string, IconEntry> = {
  index:    { active: 'home',                inactive: 'home-outline',                label: 'الرئيسية'  },
  courses:  { active: 'book',                inactive: 'book-outline',                label: 'كورساتي'   },
  chat:     { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline', label: 'التواصل'   },
  students: { active: 'people',              inactive: 'people-outline',              label: 'طلابي'     },
  settings: { active: 'settings',            inactive: 'settings-outline',            label: 'الإعدادات' },
};

// ─── تخصيص الأيقونات والتسميات بحسب الدور ───────────────────────────
type RoleOverrides = Partial<Record<string, Partial<IconEntry>>>;

const ROLE_OVERRIDES: Record<UserRole, RoleOverrides> = {
  student: {},
  teacher: {},
  assistant: {
    students: { label: 'طلابي' },
  },
  parent: {
    students: {
      active: 'heart',
      inactive: 'heart-outline',
      label: 'أبنائي',
    },
  },
  admin: {
    courses: {
      active: 'library',
      inactive: 'library-outline',
      label: 'المقررات',
    },
    students: {
      active: 'people-circle',
      inactive: 'people-circle-outline',
      label: 'المستخدمين',
    },
  },
};

function getIcons(routeName: string, role: UserRole): IconEntry {
  const base = BASE_ICONS[routeName] ?? {
    active: 'ellipse',
    inactive: 'ellipse-outline',
    label: routeName,
  };
  const overrides = ROLE_OVERRIDES[role]?.[routeName] ?? {};
  return { ...base, ...overrides };
}

// ─── زر تاب واحد ─────────────────────────────────────────────────────
function TabItem({
  routeName,
  focused,
  onPress,
  role,
  labelOverride,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
  role: UserRole;
  labelOverride?: string;
}) {
  const scale  = useRef(new Animated.Value(focused ? 1 : 0.95)).current;
  const pillOp = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,  {
        toValue: focused ? 1 : 0.95,
        useNativeDriver: true,
        damping: 14,
        stiffness: 160,
      }),
      Animated.timing(pillOp, {
        toValue: focused ? 1 : 0,
        useNativeDriver: true,
        duration: 180,
      }),
    ]).start();
  }, [focused]);

  const icons = getIcons(routeName, role);
  const label = labelOverride || icons.label;
  const color = focused ? ACTIVE : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      android_ripple={null}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {/* خلفية الـ pill للتاب النشط */}
        <Animated.View style={[styles.pill, { opacity: pillOp }]} />

        <Ionicons
          name={(focused ? icons.active : icons.inactive) as any}
          size={22}
          color={color}
        />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── التاب بار الرئيسي ───────────────────────────────────────────────
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const { user } = useAuth();
  const role: UserRole = user?.role ?? 'student';

  const visibleRoutes = state.routes.filter((r) => {
    const opts = descriptors[r.key].options as any;
    return opts.href !== null;
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomPad + 10 }]}
    >
      <View style={styles.bar}>
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.index === state.routes.indexOf(route as any);

          // التسمية: نأخذ title من الـ options إذا وُجد (يعكس الدور)
          const labelOverride =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
              ? options.title
              : undefined;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              focused={focused}
              onPress={onPress}
              role={role}
              labelOverride={labelOverride}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── الـ Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 18,
    right: 18,
    alignItems: 'stretch',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: NAV_BG,
    borderRadius: 36,
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 6,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 28,
    minWidth: 52,
  },
  pill: {
    position: 'absolute',
    inset: 0,
    borderRadius: 28,
    backgroundColor: PILL_BG,
  },
  label: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
