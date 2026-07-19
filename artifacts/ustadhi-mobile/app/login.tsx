import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { fontScale } = useApp();
  const fs = fontScale;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const btnScale = useRef(new Animated.Value(1)).current;

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setLoading(true);
    setError('');
    const result = await login(username.trim(), password);
    setLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/courses');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error ?? 'حدث خطأ ما');
    }
  };

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#101D36', '#1e3a6e', '#2d5299']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 20,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={26} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={40} color="#101D36" />
          </View>
          <Text style={[styles.logoText, { fontFamily: 'Tajawal_900Black', fontSize: 32 * fs, color: '#fff' }]}>
            استاذي
          </Text>
          <Text style={[styles.logoSub, { fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, color: 'rgba(255,255,255,0.7)' }]}>
            منصة استاذي التعليمية
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <Text style={[styles.cardTitle, { fontFamily: 'Tajawal_700Bold', fontSize: 22 * fs, color: '#fff' }]}>
            تسجيل الدخول
          </Text>
          <Text style={[styles.cardSub, { fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, color: 'rgba(255,255,255,0.65)' }]}>
            أدخل بيانات حسابك للمتابعة
          </Text>

          {/* Username */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs, color: 'rgba(255,255,255,0.85)' }]}>
              اسم المستخدم
            </Text>
            <View style={[styles.inputRow, { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Ionicons name="person" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="اسم المستخدم"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={[styles.input, { color: '#fff', fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
                autoCapitalize="none"
                textAlign="right"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { fontFamily: 'Tajawal_500Medium', fontSize: 14 * fs, color: 'rgba(255,255,255,0.85)' }]}>
              كلمة المرور
            </Text>
            <View style={[styles.inputRow, { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.inputIcon}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="كلمة المرور"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry={!showPassword}
                style={[styles.input, { color: '#fff', fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color="#fca5a5" />
              <Text style={[styles.errorText, { fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Login button */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[styles.loginBtn, { backgroundColor: '#fff', opacity: loading ? 0.7 : 1 }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.loginBtnText, { fontFamily: 'Tajawal_700Bold', fontSize: 16 * fs, color: '#101D36' }]}>
                {loading ? 'جاري الدخول...' : 'دخول'}
              </Text>
              {!loading && <Ionicons name="arrow-back" size={18} color="#101D36" />}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  backBtn: { marginBottom: 10, alignSelf: 'flex-end' },
  logoArea: { alignItems: 'center', gap: 8, marginBottom: 30 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoText: {},
  logoSub: {},
  card: {
    borderRadius: 24,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardTitle: { textAlign: 'right' },
  cardSub: { marginTop: -8, textAlign: 'right' },
  fieldWrap: { gap: 6 },
  fieldLabel: { textAlign: 'right' },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 0,
    minHeight: 50,
  },
  inputIcon: { paddingLeft: 8 },
  input: { flex: 1, textAlign: 'right' },
  errorRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
    padding: 10,
    borderRadius: 12,
  },
  errorText: { color: '#fca5a5', flex: 1, textAlign: 'right' },
  loginBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 15,
    gap: 8,
    marginTop: 4,
  },
  loginBtnText: {},
});
