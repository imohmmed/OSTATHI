/**
 * admin/parents.tsx — إدارة أولياء الأمور (للأدمن)
 */
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import * as Haptics from 'expo-haptics';

interface Parent {
  id: number;
  fullName: string;
  username: string;
  phone: string;
  studentId: number;
  student: { id: number; fullName: string; gradeLevel: string } | null;
}

export default function AdminParentsScreen() {
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

  const [showEdit, setShowEdit] = useState(false);
  const [editItem, setEditItem] = useState<Parent | null>(null);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { data: parents = [], isLoading, refetch, isRefetching } = useQuery<Parent[]>({
    queryKey: ['admin-parents'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/mobile/admin/parents`, {
        headers: { 'x-admin-token': adminToken ?? '' },
      });
      return res.ok ? res.json() : [];
    },
    enabled: !!adminToken,
  });

  const filtered = search.trim()
    ? parents.filter(p =>
        p.fullName.toLowerCase().includes(search.toLowerCase()) ||
        p.username.toLowerCase().includes(search.toLowerCase()) ||
        (p.student?.fullName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : parents;

  const openEdit = (p: Parent) => {
    setEditItem(p);
    setForm({ fullName: p.fullName, username: p.username, password: '', phone: p.phone ?? '' });
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    if (!form.fullName.trim() || !form.username.trim()) {
      Alert.alert('خطأ', 'الاسم واسم المستخدم مطلوبان'); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(), username: form.username.trim(), phone: form.phone.trim(),
      };
      if (form.password.trim()) body.password = form.password.trim();
      const res = await fetch(`${base}/api/mobile/admin/parents/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'فشل'); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin-parents'] });
      setShowEdit(false); setEditItem(null);
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل');
    } finally { setSaving(false); }
  };

  const handleDelete = (p: Parent) => {
    Alert.alert('حذف ولي الأمر', `حذف "${p.fullName}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          await fetch(`${base}/api/mobile/admin/parents/${p.id}`, {
            method: 'DELETE', headers: { 'x-admin-token': adminToken ?? '' },
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          qc.invalidateQueries({ queryKey: ['admin-parents'] });
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Parent }) => (
    <View style={[S.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={S.cardLeft}>
        <View style={[S.avatar, { backgroundColor: '#10b98120' }]}>
          <Text style={[S.avatarText, { color: '#10b981' }]}>{item.fullName.charAt(0)}</Text>
        </View>
        <View style={S.cardInfo}>
          <Text style={[S.name, { color: c.foreground, fontSize: 15 * fs }]} numberOfLines={1}>
            {item.fullName}
          </Text>
          <Text style={[S.sub, { color: c.mutedForeground, fontSize: 12 * fs }]}>
            @{item.username} {item.phone ? `• ${item.phone}` : ''}
          </Text>
          {item.student && (
            <Text style={[S.sub, { color: '#10b981', fontSize: 11 * fs }]}>
              ولي أمر: {item.student.fullName} ({item.student.gradeLevel})
            </Text>
          )}
        </View>
      </View>
      <View style={S.actions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={S.iconBtn}>
          <Ionicons name="create-outline" size={20} color={c.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={S.iconBtn}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[S.container, { backgroundColor: c.background }]}>
      <PageHeader
        title="إدارة أولياء الأمور"
        onBack={() => router.back()}
        backgroundColor={c.background}
        tintColor={c.foreground}
        borderColor={c.border}
      />

      {/* ملاحظة: ولي الأمر يُضاف من صفحة تفاصيل الطالب */}
      <View style={[S.noteBanner, { backgroundColor: c.primary + '15', borderColor: c.primary + '40' }]}>
        <Ionicons name="information-circle-outline" size={16} color={c.primary} />
        <Text style={[S.noteText, { color: c.primary, fontSize: 12 * fs }]}>
          لإضافة ولي أمر: افتح ملف الطالب ← تفاصيل الطالب ← إضافة ولي أمر
        </Text>
      </View>

      {/* Search */}
      <View style={[S.searchWrap, { borderColor: c.border, backgroundColor: c.card }]}>
        <Ionicons name="search-outline" size={18} color={c.mutedForeground} />
        <TextInput
          value={search} onChangeText={setSearch}
          placeholder="بحث بالاسم أو اسم الطالب..."
          placeholderTextColor={c.mutedForeground} textAlign="right"
          style={[S.searchInput, { color: c.foreground, fontSize: 14 * fs }]}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={c.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => String(p.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 60 + insets.bottom, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} />}
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name="people-circle-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, fontSize: 15 * fs, textAlign: 'center' }}>
                لا يوجد أولياء أمور
              </Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[S.modal, { backgroundColor: c.background }]}>
            <View style={[S.modalHeader, { borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Text style={{ color: c.mutedForeground, fontSize: 15 * fs }}>إلغاء</Text>
              </TouchableOpacity>
              <Text style={{ color: c.foreground, fontWeight: '700', fontSize: 17 * fs }}>تعديل ولي أمر</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}
                style={[S.saveBtn, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> :
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 * fs }}>حفظ</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled"
              contentContainerStyle={[S.modalBody, { paddingBottom: 40 + insets.bottom }]}>
              {[
                { key: 'fullName', label: 'الاسم الكامل *', ph: 'حسن الزيدي' },
                { key: 'username', label: 'اسم المستخدم *', ph: 'parent1' },
                { key: 'password', label: 'كلمة مرور جديدة (اتركها فارغة)', ph: '••••••••' },
                { key: 'phone', label: 'رقم الهاتف', ph: '07xxxxxxxxx' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={[S.label, { color: c.foreground, fontSize: 13 * fs }]}>{f.label}</Text>
                  <TextInput
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.ph} placeholderTextColor={c.mutedForeground}
                    secureTextEntry={f.key === 'password'} textAlign="right"
                    style={[S.input, { backgroundColor: c.card, borderColor: c.border, color: c.foreground, fontSize: 14 * fs }]}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  noteBanner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginHorizontal: 12, marginBottom: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  noteText: { flex: 1, textAlign: 'right' },
  searchWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, paddingVertical: 0 },
  card: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, padding: 12 },
  cardLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1, gap: 2 },
  name: { fontWeight: '700', textAlign: 'right' },
  sub: { textAlign: 'right' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6 },
  empty: { alignItems: 'center', gap: 12, marginTop: 80 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  modalBody: { padding: 16, gap: 8 },
  label: { textAlign: 'right', fontWeight: '600', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
});
