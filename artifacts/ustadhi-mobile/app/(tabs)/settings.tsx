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

// ─── Section label ────────────────────────────
function SectionLabel({ title, fs, color }: { title: string; fs: number; color: string }) {
  return (
    <View style={styles.groupLabel}>
      <Text style={{ color, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs, textAlign: 'right' }}>
        {title}
      </Text>
    </View>
  );
}

// ─── iOS-style grouped section ────────────────
function SettingGroup({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  const validChildren = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, { backgroundColor: colors.card }]}>
      {validChildren.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Row inside a group ───────────────────────
function GroupRow({
  icon,
  iconBg,
  label,
  value,
  right,
  colors,
  fs,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  label: string;
  value?: string;
  right?: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  fs: number;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.groupRow}>
      {/* Right side: icon + label */}
      <View style={styles.rowRight}>
        <View style={[styles.iconBox, { backgroundColor: iconBg ?? colors.muted }]}>
          <Ionicons name={icon} size={17} color={iconBg ? '#fff' : colors.primary} />
        </View>
        <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }}>
          {label}
        </Text>
      </View>
      {/* Left side: value or right element */}
      <View style={styles.rowLeft}>
        {right ?? (value ? (
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }}>
            {value}
          </Text>
        ) : (
          <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
        ))}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

// ─── Teacher profile card ─────────────────────
function TeacherProfileCard({ colors, fs }: { colors: ReturnType<typeof useColors>; fs: number }) {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.fullName.split(' ').slice(0, 2).map(w => w[0]).join('');
  const subjects = user.subjects ?? [];
  const gradeLevels = user.gradeLevels ?? [];

  return (
    <View style={[styles.teacherCard, { backgroundColor: colors.card }]}>
      {/* Header gradient */}
      <LinearGradient colors={['#101D36', '#1e3a6e']} style={styles.teacherCardHeader}>
        <View style={styles.teacherHeaderContent}>
          <View style={[styles.profileAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 24 * fs }}>
              {initials}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs, textAlign: 'right' }}>
              {user.fullName}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', marginTop: 2 }}>
              أستاذ
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Details */}
      <View style={styles.teacherCardBody}>
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
            <Ionicons name="call-outline" size={16} color={colors.primary} />
          </View>
          <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, flex: 1, textAlign: 'right' }} dir="ltr">
            {user.phone}
          </Text>
        </View>

        {!!user.bio && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
            </View>
            <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, flex: 1, textAlign: 'right', lineHeight: 20 }}>
              {user.bio}
            </Text>
          </View>
        )}

        {subjects.length > 0 && (
          <View style={[styles.detailBlock, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="book-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.pillsWrap}>
              {subjects.map(s => (
                <View key={s.id} style={[styles.pill, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                  <Text style={{ color: colors.primary, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }}>
                    {s.icon ? `${s.icon} ` : ''}{s.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {gradeLevels.length > 0 && (
          <View style={styles.detailBlock}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="school-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.pillsWrap}>
              {gradeLevels.map(gl => (
                <View key={gl} style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }}>
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

// ─── Student / Parent profile card ───────────
function SimpleProfileCard({ colors, fs }: { colors: ReturnType<typeof useColors>; fs: number }) {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.fullName.split(' ').slice(0, 2).map(w => w[0]).join('');

  return (
    <LinearGradient colors={['#101D36', '#1a2a45']} style={styles.profileCard}>
      <View style={[styles.profileAvatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
        <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 24 * fs }}>
          {initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs, textAlign: 'right' }}>
          {user.fullName}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', marginTop: 3 }}>
          {ROLE_LABELS[user.role] ?? user.role}
          {user.gradeLevel ? ` — ${user.gradeLevel}` : ''}
          {user.studentName ? ` — ${user.studentName}` : ''}
        </Text>
      </View>
    </LinearGradient>
  );
}

// ─── Main screen ──────────────────────────────
export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, logout } = useAuth();
  const { fontScale, setFontScale, setThemeMode, effectiveTheme } = useApp();
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
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 20 * fs, textAlign: 'right' }}>
          الإعدادات
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 20 }}
      >
        {/* ── Profile card ── */}
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
              <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs, flex: 1, textAlign: 'right' }}>
                تسجيل الدخول
              </Text>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── المظهر ── */}
        <SectionLabel title="المظهر" fs={fs} color={colors.mutedForeground} />
        <SettingGroup colors={colors}>
          <GroupRow
            icon={isDark ? 'moon' : 'sunny-outline'}
            iconBg={isDark ? '#5856D6' : '#FF9500'}
            label="الوضع الليلي"
            colors={colors}
            fs={fs}
            right={
              <Switch
                value={isDark}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemeMode(v ? 'dark' : 'light');
                }}
                trackColor={{ false: colors.muted, true: '#34C759' }}
                thumbColor="#fff"
              />
            }
          />
        </SettingGroup>

        {/* ── حجم الخط ── */}
        <SectionLabel title="حجم الخط" fs={fs} color={colors.mutedForeground} />
        <SettingGroup colors={colors}>
          <View style={styles.fontSizeRow}>
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
                    backgroundColor: fontScale === item.value ? colors.primary : 'transparent',
                    flex: 1,
                  },
                ]}
              >
                <Text style={{
                  color: fontScale === item.value ? colors.primaryForeground : colors.mutedForeground,
                  fontFamily: fontScale === item.value ? 'Tajawal_700Bold' : 'Tajawal_500Medium',
                  fontSize: 14,
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingGroup>

        {/* ── عام ── */}
        <SectionLabel title="عام" fs={fs} color={colors.mutedForeground} />
        <SettingGroup colors={colors}>
          <GroupRow
            icon="language-outline"
            iconBg="#007AFF"
            label="اللغة"
            value="عربي"
            colors={colors}
            fs={fs}
          />
          <GroupRow
            icon="information-circle-outline"
            iconBg="#8E8E93"
            label="عن التطبيق"
            value="1.0.0"
            colors={colors}
            fs={fs}
          />
        </SettingGroup>

        {/* ── لوحة تحكم الأدمن ── */}
        {(user as any)?.adminToken && (
          <>
            <SectionLabel title="لوحة التحكم" fs={fs} color={colors.mutedForeground} />
            <SettingGroup colors={colors}>
              <GroupRow
                icon="person-outline"
                iconBg="#3b82f6"
                label="إدارة الأساتذة"
                colors={colors}
                fs={fs}
                onPress={() => router.push('/admin/teachers' as any)}
              />
              <GroupRow
                icon="people-outline"
                iconBg="#8b5cf6"
                label="إدارة المساعدين"
                colors={colors}
                fs={fs}
                onPress={() => router.push('/admin/assistants' as any)}
              />
              <GroupRow
                icon="people-circle-outline"
                iconBg="#10b981"
                label="إدارة أولياء الأمور"
                colors={colors}
                fs={fs}
                onPress={() => router.push('/admin/parents' as any)}
              />
              <GroupRow
                icon="book-outline"
                iconBg="#f59e0b"
                label="إدارة المواد"
                colors={colors}
                fs={fs}
                onPress={() => router.push('/subjects' as any)}
              />
            </SettingGroup>
          </>
        )}

        {/* ── تسجيل الخروج ── */}
        {isLoggedIn && (
          <>
            <SectionLabel title="" fs={fs} color={colors.mutedForeground} />
            <SettingGroup colors={colors}>
              <TouchableOpacity
                onPress={handleLogout}
                activeOpacity={0.7}
                style={styles.groupRow}
              >
                <View style={styles.rowRight}>
                  <View style={[styles.iconBox, { backgroundColor: '#FF3B3020' }]}>
                    <Ionicons name="log-out-outline" size={17} color="#FF3B30" />
                  </View>
                  <Text style={{ color: '#FF3B30', fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }}>
                    تسجيل الخروج
                  </Text>
                </View>
                <View />
              </TouchableOpacity>
            </SettingGroup>
          </>
        )}

        <View style={styles.appNameWrap}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }}>
            منصة استاذي التعليمية
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const R = 28; // global corner radius

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },

  // Profile cards
  profileCard: { flexDirection: 'row-reverse', alignItems: 'center', marginHorizontal: 16, borderRadius: R, padding: 18, gap: 14 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },

  // Teacher card
  teacherCard: { marginHorizontal: 16, borderRadius: R, overflow: 'hidden' },
  teacherCardHeader: { padding: 18 },
  teacherHeaderContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  teacherCardBody: { padding: 14 },
  detailRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  detailBlock: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  pillsWrap: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },

  // iOS-style group
  group: { marginHorizontal: 16, borderRadius: R, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },

  // Row inside group
  groupRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  rowRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Section labels
  groupLabel: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 },

  // Font size
  fontSizeRow: { flexDirection: 'row-reverse', paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  fontBtn: { paddingVertical: 8, borderRadius: 18, alignItems: 'center' },

  appNameWrap: { alignItems: 'center', marginTop: 28, marginBottom: 4 },
});
