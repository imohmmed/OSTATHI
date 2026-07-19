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
import { LinearGradient } from 'expo-linear-gradient';
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

const FONT_SIZES: { label: string; value: FontScale }[] = [
  { label: 'صغير', value: 0.9 },
  { label: 'متوسط', value: 1 },
  { label: 'كبير', value: 1.15 },
];

// ─── Section label ───────────────────────────
function SectionLabel({ title, fs, color }: { title: string; fs: number; color: string }) {
  return (
    <View style={styles.groupLabel}>
      <Text style={[styles.groupTitle, { color, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }]}>
        {title}
      </Text>
    </View>
  );
}

// ─── Setting row ─────────────────────────────
function SettingRow({
  icon, label, value, right, colors, fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  right?: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  fs: number;
}) {
  return (
    <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowRight}>
        <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>
          {label}
        </Text>
      </View>
      {right ?? (value ? (
        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>
          {value}
        </Text>
      ) : null)}
    </View>
  );
}

// ─── Teacher profile card ─────────────────────
function TeacherProfileCard({ colors, fs }: { colors: ReturnType<typeof useColors>; fs: number }) {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.fullName.split(' ').slice(0, 2).map(w => w[0]).join('');
  const subjects = user.subjects ?? [];
  const gradeLevels = user.gradeLevels ?? [];

  return (
    <View style={[styles.teacherCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Avatar + Name */}
      <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.teacherCardHeader}>
        <View style={styles.teacherHeaderContent}>
          <View style={[styles.profileAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 24 * fs }]}>
              {initials}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs, textAlign: 'right' }]}>
              {user.fullName}
            </Text>
            <Text style={[{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', marginTop: 2 }]}>
              أستاذ
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Details */}
      <View style={styles.teacherCardBody}>
        {/* Phone */}
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
            <Ionicons name="call-outline" size={16} color={colors.primary} />
          </View>
          <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, flex: 1, textAlign: 'right' }]}
            dir="ltr">
            {user.phone}
          </Text>
        </View>

        {/* Bio */}
        {!!user.bio && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, flex: 1, textAlign: 'right', lineHeight: 20 }]}>
              {user.bio}
            </Text>
          </View>
        )}

        {/* Subjects */}
        {subjects.length > 0 && (
          <View style={[styles.detailBlock, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="book-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.pillsWrap}>
              {subjects.map(s => (
                <View key={s.id} style={[styles.pill, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                  <Text style={[{ color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                    {s.icon ? `${s.icon} ` : ''}{s.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Grade levels */}
        {gradeLevels.length > 0 && (
          <View style={styles.detailBlock}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="school-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.pillsWrap}>
              {gradeLevels.map(gl => (
                <View key={gl} style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>
                    {gl}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Student / Parent profile card (simple) ──
function SimpleProfileCard({ colors, fs }: { colors: ReturnType<typeof useColors>; fs: number }) {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.fullName.split(' ').slice(0, 2).map(w => w[0]).join('');

  return (
    <LinearGradient
      colors={['#101D36', '#1a2a45']}
      style={styles.profileCard}
    >
      <View style={[styles.profileAvatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
        <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 24 * fs }]}>
          {initials}
        </Text>
      </View>
      <View style={styles.profileInfo}>
        <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs, textAlign: 'right' }]}>
          {user.fullName}
        </Text>
        <Text style={[{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', marginTop: 3 }]}>
          {ROLE_LABELS[user.role] ?? user.role}
          {user.gradeLevel ? ` — ${user.gradeLevel}` : ''}
          {user.studentName ? ` — ${user.studentName}` : ''}
        </Text>
      </View>
    </LinearGradient>
  );
}

// ─── Main screen ─────────────────────────────
export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, logout } = useAuth();
  const { fontScale, setFontScale, themeMode, setThemeMode, effectiveTheme } = useApp();
  const router = useRouter();
  const fs = fontScale;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const isDark = effectiveTheme === 'dark';
  const isTeacher = user?.role === 'teacher';

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد الخروج من حسابك؟', [
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs }]}>
          الإعدادات
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 20 }}
      >
        {/* Profile section */}
        {isLoggedIn && user ? (
          isTeacher ? (
            <TeacherProfileCard colors={colors} fs={fs} />
          ) : (
            <SimpleProfileCard colors={colors} fs={fs} />
          )
        ) : (
          <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.85}>
            <LinearGradient colors={['#101D36', '#1a2a45']} style={styles.profileCard}>
              <Ionicons name="person-circle" size={32} color="#fff" />
              <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs, flex: 1, textAlign: 'right' }]}>
                تسجيل الدخول
              </Text>
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Appearance */}
        <SectionLabel title="المظهر" fs={fs} color={colors.mutedForeground} />

        {/* Dark mode */}
        <SettingRow
          icon={isDark ? 'moon' : 'sunny'}
          label="الوضع الليلي"
          colors={colors} fs={fs}
          right={
            <Switch
              value={isDark}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setThemeMode(v ? 'dark' : 'light');
              }}
              trackColor={{ false: colors.muted, true: colors.accent }}
              thumbColor={colors.primary}
            />
          }
        />

        {/* Font size */}
        <SectionLabel title="حجم الخط" fs={fs} color={colors.mutedForeground} />

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
                  { backgroundColor: fontScale === item.value ? colors.primary : colors.muted, flex: 1 },
                ]}
              >
                <Text style={[{ color: fontScale === item.value ? colors.primaryForeground : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 13 }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* General */}
        <SectionLabel title="عام" fs={fs} color={colors.mutedForeground} />

        <SettingRow icon="language" label="اللغة" value="عربي" colors={colors} fs={fs} />
        <View style={{ height: 2 }} />
        <SettingRow icon="information-circle" label="عن التطبيق" value="1.0.0" colors={colors} fs={fs} />

        <View style={styles.appNameWrap}>
          <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
            منصة استاذي التعليمية
          </Text>
        </View>

        {/* Logout */}
        {isLoggedIn && (
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[{ color: '#ef4444', fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
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
  screenTitle: { textAlign: 'right' },

  // Teacher card
  teacherCard: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  teacherCardHeader: { padding: 18 },
  teacherHeaderContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  teacherCardBody: { padding: 14, gap: 0 },
  detailRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  detailBlock: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  pillsWrap: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },

  // Simple profile card
  profileCard: { flexDirection: 'row-reverse', alignItems: 'center', marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 14 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },

  groupLabel: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 },
  groupTitle: { textAlign: 'right' },

  settingRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 2, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  rowRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: {},

  fontSizeButtons: { flexDirection: 'row-reverse', gap: 8, flex: 1 },
  fontBtn: { paddingVertical: 8, borderRadius: 8, alignItems: 'center' },

  appNameWrap: { alignItems: 'center', marginTop: 24, marginBottom: 4 },

  logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, gap: 10 },
});
