/**
 * admin/reviews.tsx — إدارة تقييمات الأساتذة (أدمن)
 * عرض كل التقييمات + حذف
 */
import React, { useState } from 'react';
import {
  Alert, FlatList, StyleSheet, Text, TouchableOpacity, View,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageHeader } from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

interface Review {
  id: number;
  teacherId: number;
  liked: boolean;
  reason: string | null;
  studentName: string | null;
  createdAt: string;
  teacherName: string | null;
}

export default function AdminReviewsScreen() {
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

  const [refreshing, setRefreshing] = useState(false);

  const { data: reviews, isLoading, refetch } = useQuery<Review[]>({
    queryKey: ['adminTeacherReviews'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/teacher-reviews`, { headers });
      if (!res.ok) throw new Error('فشل جلب التقييمات');
      return res.json();
    },
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const deleteReview = (r: Review) => {
    Alert.alert('حذف التقييم', 'هل أنت متأكد من حذف هذا التقييم؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${base}/api/teacher-reviews/${r.id}`, { method: 'DELETE', headers });
            if (!res.ok && res.status !== 204) throw new Error('فشل الحذف');
            qc.invalidateQueries({ queryKey: ['adminTeacherReviews'] });
          } catch (e: any) {
            Alert.alert('خطأ', e.message ?? 'فشل');
          }
        },
      },
    ]);
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <PageHeader
        title="تقييمات الأساتذة"
        onBack={() => router.back()}
        backgroundColor={c.background}
        tintColor={c.foreground}
        borderColor={c.border}
      />
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={c.primary} /></View>
      ) : (
        <FlatList
          data={reviews ?? []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="star-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs, marginTop: 10 }}>
                لا توجد تقييمات بعد
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.cardTop}>
                <TouchableOpacity onPress={() => deleteReview(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={19} color="#ef4444" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons
                    name={item.liked ? 'thumbs-up' : 'thumbs-down'}
                    size={18}
                    color={item.liked ? '#10b981' : '#ef4444'}
                  />
                  <Text style={{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }} numberOfLines={1}>
                    {item.teacherName ?? 'أستاذ محذوف'}
                  </Text>
                </View>
              </View>
              {!!item.reason && (
                <Text style={{ color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', marginTop: 6, lineHeight: 20 }}>
                  {item.reason}
                </Text>
              )}
              <View style={styles.cardBottom}>
                <Text style={{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }}>
                  {fmtDate(item.createdAt)}
                </Text>
                <Text style={{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }}>
                  {item.studentName ?? 'مجهول'}
                </Text>
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
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
});
