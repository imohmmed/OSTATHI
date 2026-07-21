/**
 * FloatingTabBar — عائم ومستدير من كل الاتجاهات
 * يُستخدم على Android وأي منصة بدون Liquid Glass
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

const NAV_BG   = '#101D36';
const ACTIVE   = '#D4A843';
const INACTIVE = 'rgba(255,255,255,0.50)';
const PILL_BG  = 'rgba(212,168,67,0.18)';  // خلفية الـ pill للعنصر النشط

// ─── خريطة الأيقونات لكل تاب ─────────────────────────────────────────
const ICON_MAP: Record<string, { active: any; inactive: any; label: string }> = {
  index:    { active: 'home',                  inactive: 'home-outline',                  label: 'الرئيسية' },
  courses:  { active: 'book',                  inactive: 'book-outline',                  label: 'كورساتي'  },
  chat:     { active: 'chatbubble-ellipses',   inactive: 'chatbubble-ellipses-outline',   label: 'التواصل'  },
  students: { active: 'people',                inactive: 'people-outline',                label: 'طلابي'    },
  settings: { active: 'settings',              inactive: 'settings-outline',              label: 'الإعدادات'},
};

// ─── زر تاب واحد ─────────────────────────────────────────────────────
function TabItem({
  route,
  focused,
  onPress,
  label,
}: {
  route: { name: string };
  focused: boolean;
  onPress: () => void;
  label: string;
}) {
  const scale  = useRef(new Animated.Value(focused ? 1 : 0.95)).current;
  const pillOp = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,  { toValue: focused ? 1 : 0.95, useNativeDriver: true, damping: 14, stiffness: 160 }),
      Animated.timing(pillOp, { toValue: focused ? 1 : 0,    useNativeDriver: true, duration: 180 }),
    ]).start();
  }, [focused]);

  const icons = ICON_MAP[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline', label };
  const color = focused ? ACTIVE : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      android_ripple={null}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {/* Pill خلفية النشط */}
        <Animated.View style={[styles.pill, { opacity: pillOp }]} />

        <Ionicons
          name={focused ? icons.active : icons.inactive}
          size={22}
          color={color}
        />
        <Text style={[styles.label, { color }]}>{icons.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── التاب بار الرئيسي ───────────────────────────────────────────────
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  const visibleRoutes = state.routes.filter((r) => {
    const opts = descriptors[r.key].options as any;
    // expo-router sets href: null to hide a tab
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

          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);

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
              route={route}
              focused={focused}
              onPress={onPress}
              label={label}
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
    // لا نضع pointerEvents هنا — نتركه على الـ View الخارجي
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: NAV_BG,
    borderRadius: 36,
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 6,
    // ظل Android
    elevation: 20,
    // ظل iOS (احتياطي)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    // تأكد الحواف مستديرة على Android
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
