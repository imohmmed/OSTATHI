/**
 * Watch screen — student watches a live stream.
 * Route: /livestream/watch/[id]
 */
import React, { useRef, useCallback } from 'react';
import {
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function WatchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const base = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';

  // Build viewer info
  const viewerId = user?.id ? `student_${user.id}` : `anon_${Math.random().toString(36).slice(2, 6)}`;
  const viewerName = encodeURIComponent((user as any)?.fullName ?? 'طالب');

  const watchUrl = `${base}/api/stream/watch.html?id=${id}&viewerId=${viewerId}&name=${viewerName}`;

  const webRef = useRef<WebView>(null);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'stream-ended') {
        Alert.alert('انتهى البث', 'انتهى البث المباشر', [
          { text: 'حسناً', onPress: () => router.back() },
        ]);
      }
    } catch {}
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {/* Back button overlay */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <WebView
        ref={webRef}
        source={{ uri: watchUrl }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        onMessage={handleMessage}
        androidLayerType="hardware"
        onError={() =>
          Alert.alert('خطأ', 'تعذر تحميل البث. تحقق من الاتصال.', [
            { text: 'رجوع', onPress: () => router.back() },
          ])
        }
        javaScriptEnabled
        domStorageEnabled
        allowsProtectedMedia
        allowsFullscreenVideo
        // Picture-in-Picture
        allowsPictureInPictureMediaPlayback
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 30,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
