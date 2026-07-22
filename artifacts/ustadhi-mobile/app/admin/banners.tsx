/**
 * admin/banners.tsx — إدارة البانرات (أدمن)
 * عرض / إضافة / تفعيل-تعطيل / حذف
 */
import React, { useState } from 'react';
import {
  Alert, FlatList, Image, Platform, StyleSheet, Switch,
  Text, TouchableOpacity, View, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { PageHeader } from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

interface Banner {
  id: number;
  imageUrl: string;
  linkUrl: string | null;
  orderIndex: number;
  isActive: boolean;
}

async function readImageBase64(uri: string): Promise<{ data: string; mimeType: string }> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: blob.type || 'image/jpeg' });
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const FileSystem = await import('expo-file-system');
  const data = await FileSystem.default.readAsStringAsync(uri, { encoding: 'base64' as any });
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp' };
  return { data, mimeType: mimeMap[ext] ?? 'image/jpeg' };
}

export default function AdminBannersScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const qc = useQueryClient();

  const adminToken = (user as any)?.adminToken;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  const headers = { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' };

  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: banners, isLoading, refetch } = useQuery<Banner[]>({
    queryKey: ['adminBanners'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/admin/banners`, { headers });
      if (!res.ok) throw new Error('فشل جلب البانرات');
      return res.json();
    },
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const addBanner = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('تنبيه', 'يجب السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const { data, mimeType } = await readImageBase64(result.assets[0].uri);
      const up = await fetch(`${base}/api/upload/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mimeType, filename: 'banner' }),
      });
      if (!up.ok) throw new Error('فشل رفع الصورة');
      const imageUrl = `${base}${(await up.json()).url}`;
      const res = await fetch(`${base}/api/admin/banners`, {
        method: 'POST', headers,
        body: JSON.stringify({ imageUrl, orderIndex: (banners?.length ?? 0) }),
      });
      if (!res.ok) throw new Error('فشل إضافة البانر');
      qc.invalidateQueries({ queryKey: ['adminBanners'] });
      qc.invalidateQueries({ queryKey: ['getBanners'] });
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (b: Banner) => {
    try {
      const res = await fetch(`${base}/api/admin/banners/${b.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      if (!res.ok) throw new Error('فشل التحديث');
      qc.invalidateQueries({ queryKey: ['adminBanners'] });
      qc.invalidateQueries({ queryKey: ['getBanners'] });
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل');
    }
  };

  const deleteBanner = (b: Banner) => {
    Alert.alert('حذف البانر', 'هل أنت متأكد من حذف هذا البانر؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${base}/api/admin/banners/${b.id}`, { method: 'DELETE', headers });
            if (!res.ok && res.status !== 204) throw new Error('فشل الحذف');
            qc.invalidateQueries({ queryKey: ['adminBanners'] });
            qc.invalidateQueries({ queryKey: ['getBanners'] });
          } catch (e: any) {
            Alert.alert('خطأ', e.message ?? 'فشل');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <PageHeader
        title="إدارة البانرات"
        onBack={() => router.back()}
        backgroundColor={c.background}
        tintColor={c.foreground}
        borderColor={c.border}
        right={
          <TouchableOpacity onPress={addBanner} disabled={uploading} style={[styles.addBtn, { backgroundColor: c.primary, opacity: uploading ? 0.6 : 1 }]}>
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="add" size={20} color="#fff" />}
          </TouchableOpacity>
        }
      />
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={c.primary} /></View>
      ) : (
        <FlatList
          data={banners ?? []}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="images-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, marginTop: 10 }}>
                لا توجد بانرات — اضغط + لإضافة بانر
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Image source={{ uri: item.imageUrl }} style={styles.bannerImg} resizeMode="cover" />
              <View style={styles.cardRow}>
                <TouchableOpacity onPress={() => deleteBanner(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: c.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs }}>
                    {item.isActive ? 'مفعّل' : 'معطّل'}
                  </Text>
                  <Switch value={item.isActive} onValueChange={() => toggleActive(item)} trackColor={{ true: c.primary }} />
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  bannerImg: { width: '100%', aspectRatio: 16 / 9 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
