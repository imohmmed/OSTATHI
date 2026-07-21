/**
 * Broadcast screen — teacher presses "بدأ البث" and this opens the WebRTC broadcaster.
 * Route: /livestream/broadcast/[id]?courseId=<courseId>
 */
import React, { useRef, useCallback } from 'react';
import {
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function BroadcastScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const base = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';
  const streamUrl = `${base}/api/stream/broadcast.html?id=${id}&teacherId=${user?.id ?? ''}`;

  const webRef = useRef<WebView>(null);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'stream-ended') {
        // Update stream status via API
        fetch(`${base}/api/mobile/teacher/livestreams/${id}/end`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId: user?.id }),
        }).catch(() => {});
        router.back();
      }
    } catch {}
  }, [base, id, user, router]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        ref={webRef}
        source={{ uri: streamUrl }}
        style={styles.webview}
        // Camera permissions
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Allow all content
        mixedContentMode="always"
        // Handle messages from broadcast page
        onMessage={handleMessage}
        // Android camera
        androidLayerType="hardware"
        // Prevent navigation away
        onShouldStartLoadWithRequest={(req) => {
          if (req.url !== streamUrl && !req.url.startsWith('blob:') && !req.url.startsWith(base)) {
            return false;
          }
          return true;
        }}
        onError={() =>
          Alert.alert('خطأ', 'تعذر تحميل صفحة البث. تحقق من الاتصال.', [
            { text: 'رجوع', onPress: () => router.back() },
          ])
        }
        javaScriptEnabled
        domStorageEnabled
        allowsProtectedMedia
        // Fullscreen support
        allowsFullscreenVideo
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
});
