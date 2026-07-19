import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const ROLE_LABELS: Record<string, string> = {
  student: 'طالب',
  teacher: 'أستاذ',
  parent: 'ولي أمر',
};

type FontScale = 0.9 | 1 | 1.15;

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, logout } = useAuth();
  const { fontScale, setFontScale, themeMode, setThemeMode, effectiveTheme } = useApp();
  const router = useRouter();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  };

  const isDark = effectiveTheme === 'dark';

  const FONT_SIZES: { label: string; value: FontScale }[] = [
    { label: 'صغير', value: 0.9 },
    { label: 'متوسط', value: 1 },
    { label: 'كبير', value: 1.15 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          الإعدادات
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom + (Platform.OS === 'web' ? 34 : 0), paddingTop: 20 }}
      >
        {/* Profile card */}
        {isLoggedIn && user ? (
          <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
            <View style={[styles.profileAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.profileInitials, { color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 24 * fs }]}>
                {user.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('')}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs }]}>
                {user.fullName}
              </Text>
              <Text style={[styles.profileRole, { color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
                {ROLE_LABELS[user.role] ?? user.role}
                {user.gradeLevel ? ` — ${user.gradeLevel}` : ''}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/login')}
            style={[styles.loginPrompt, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="person-circle" size={32} color={colors.primaryForeground} />
            <Text style={[styles.loginPromptText, { color: colors.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs }]}>
              تسجيل الدخول
            </Text>
            <Ionicons name="chevron-back" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}

        <View style={styles.groupLabel}>
          <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
            المظهر
          </Text>
        </View>

        {/* Theme toggle */}
        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rowRight}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
              الوضع الليلي
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(v) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setThemeMode(v ? 'dark' : 'light');
            }}
            trackColor={{ false: colors.muted, true: colors.accent }}
            thumbColor={colors.primary}
          />
        </View>

        <View style={styles.groupLabel}>
          <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
            حجم الخط
          </Text>
        </View>

        {/* Font size */}
        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fontSizeButtons}>
            {FONT_SIZES.map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFontScale(item.value);
                }}
                style={[
                  styles.fontBtn,
                  {
                    backgroundColor: fontScale === item.value ? colors.primary : colors.muted,
                    flex: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fontBtnText,
                    {
                      color: fontScale === item.value ? colors.primaryForeground : colors.foreground,
                      fontFamily: 'Tajawal_500Medium',
                      fontSize: 13,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.groupLabel}>
          <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
            عام
          </Text>
        </View>

        {/* Language */}
        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rowRight}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="language" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
              اللغة
            </Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
            عربي
          </Text>
        </View>

        {/* About */}
        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rowRight}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
              عن التطبيق
            </Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
            الإصدار 1.0.0
          </Text>
        </View>

        <View style={styles.appName}>
          <Text style={[styles.appNameText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
            منصة استاذي التعليمية
          </Text>
        </View>

        {/* Logout */}
        {isLoggedIn && (
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}
          >
            <Ionicons name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
              تسجيل الخروج
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  screenTitle: {},
  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {},
  profileInfo: { flex: 1 },
  profileName: { textAlign: 'right' },
  profileRole: { textAlign: 'right', marginTop: 3 },
  loginPrompt: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  loginPromptText: { flex: 1, textAlign: 'right' },
  groupLabel: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 },
  groupTitle: { textAlign: 'right' },
  settingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 2,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: {},
  rowValue: {},
  fontSizeButtons: { flexDirection: 'row-reverse', gap: 8, flex: 1 },
  fontBtn: { paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  fontBtnText: {},
  appName: { alignItems: 'center', marginTop: 24 },
  appNameText: {},
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  logoutText: {},
});
