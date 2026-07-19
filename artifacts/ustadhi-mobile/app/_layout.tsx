import React, { useEffect } from 'react';
import { I18nManager, View, Text, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  Tajawal_900Black,
  useFonts,
} from '@expo-google-fonts/tajawal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenCapture from 'expo-screen-capture';
import { setBaseUrl } from '@workspace/api-client-react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';

// Setup API base URL
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) {
  setBaseUrl(`https://${domain}`);
}

// Force RTL for Arabic
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="subjects"
        options={{
          title: 'المواد الدراسية',
          headerBackTitle: 'رجوع',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="subject/[id]"
        options={{
          title: 'أساتذة المادة',
          headerBackTitle: 'رجوع',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="teacher/[id]"
        options={{
          title: 'الأستاذ',
          headerBackTitle: 'رجوع',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="course/[id]"
        options={{
          title: 'تفاصيل الدورة',
          headerBackTitle: 'رجوع',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#101D36' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { color: '#ffffff', fontFamily: 'Tajawal_700Bold' },
        }}
      />
      <Stack.Screen
        name="student/[id]"
        options={{
          title: 'تفاصيل الطالب',
          headerBackTitle: 'رجوع',
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}

const drmStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101D36', padding: 32, gap: 16 },
  icon: { fontSize: 56 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  msg: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
    Tajawal_900Black,
  });

  // ── DRM: prevent screenshots & screen recording ──────────────────
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    return () => { ScreenCapture.allowScreenCaptureAsync(); };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <AuthProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthProvider>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
