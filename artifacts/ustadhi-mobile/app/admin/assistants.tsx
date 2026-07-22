/**
 * admin/assistants.tsx — إدارة المساعدين (للأدمن)
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

interface Assistant {
  id: number;
  fullName: string;
  username: string;
  phone: string;
  isActive: boolean;
  teacherId: number;
  teacher: { id: number; fullName: string } | null;
}

interface TeacherOption {
  id: number;
  fullName: string;
  username: string;
}

export default function AdminAssistantsScreen() {
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

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Assistant | null>(null);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '' });
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: assistants = [], isLoading, refetch, isRefetching } = useQuery<Assistant[]>({
    queryKey: ['admin-assistants'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/mobile/admin/assistants`, {
        headers: { 'x-admin-token': adminToken ?? '' },
      });
      return res.ok ? res.json() : [];
    },
    enabled: !!adminToken,
  });

  const { data: teachers = [] } = useQuery<TeacherOption[]>({
    queryKey: ['admin-teachers-list'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/mobile/admin/teachers`, {
        headers: { 'x-admin-token': adminToken ?? '' },
      });
      return res.ok ? res.json() : [];
    },
    enabled: !!adminToken,
  });

  const resetForm = () => {
    setForm({ fullName: '', username: '', password: '', phone: '' });
    setSelectedTeacherId(null);
    setEditItem(null);
  };

  const openEdit = (a: Assistant) => {
    setEditItem(a);
    setForm({ fullName: a.fullName, username: a.username, password: '', phone: a.phone ?? '' });
    setSelectedTeacherId(a.teacherId);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.username.trim()) {
      Alert.alert('خطأ', 'الاسم واسم المستخدم مطلوبان'); return;
    }
    if (!editItem && !form.password.trim()) {
      Alert.alert('خطأ', 'كلمة المرور مطلوبة'); return;
    }
    if (!selectedTeacherId) {
      Alert.alert('خطأ', 'يجب اختيار الأستاذ المرتبط'); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(), username: form.username.trim(),
        phone: form.phone.trim(), teacherId: selectedTeacherId,
      };
      if (form.password.trim()) body.password = form.password.trim();
      const url = editItem
        ? `${base}/api/mobile/admin/assistants/${editItem.id}`
        : `${base}/api/mobile/admin/assistants`;
      const res = await fetch(url, {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'فشل'); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin-assistants'] });
      setShowAdd(false); resetForm();
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  const handleDelete = (a: Assistant) => {
    Alert.alert('حذف المساعد', `حذف "${a.fullName}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          await fetch(`${base}/api/mobile/admin/assistants/${a.id}`, {
            method: 'DELETE', headers: { 'x-admin-token': adminToken ?? '' },
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          qc.invalidateQueries({ queryKey: ['admin-assistants'] });
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Assistant }) => (
    <View style={[S.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={S.cardLeft}>
        <View style={[S.avatar, { backgroundColor: '#8b5cf620' }]}>
          <Text style={[S.avatarText, { color: '#8b5cf6' }]}>{item.fullName.charAt(0)}</Text>
        </View>
        <View style={S.cardInfo}>
          <Text style={[S.name, { color: c.foreground, fontSize: 15 * fs }]} numberOfLines={1}>
            {item.fullName}
          </Text>
          <Text style={[S.sub, { color: c.mutedForeground, fontSize: 12 * fs }]}>
            @{item.username} {item.phone ? `• ${item.phone}` : ''}
          </Text>
          {item.teacher && (
            <Text style={[S.sub, { color: '#8b5cf6', fontSize: 11 * fs }]}>
              مساعد: {item.teacher.fullName}
            </Text>
          )}
        </View>
      </View>
      <View style={S.actions}>
        <View style={[S.dot, { backgroundColor: item.isActive ? '#22c55e' : '#ef4444' }]} />
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
        title="إدارة المساعدين"
        onBack={() => router.back()}
        backgroundColor={c.background}
        tintColor={c.foreground}
        borderColor={c.border}
        right={
          <TouchableOpacity onPress={() => { resetForm(); setShowAdd(true); }}
            style={[S.addBtn, { backgroundColor: c.primary }]}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
      ) : (
        <FlatList
          data={assistants}
          keyExtractor={a => String(a.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 60 + insets.bottom, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} />}
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name="people-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, fontSize: 15 * fs, textAlign: 'center' }}>
                لا يوجد مساعدون
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => { setShowAdd(false); resetForm(); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[S.modal, { backgroundColor: c.background }]}>
            <View style={[S.modalHeader, { borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
                <Text style={{ color: c.mutedForeground, fontSize: 15 * fs }}>إلغاء</Text>
              </TouchableOpacity>
              <Text style={{ color: c.foreground, fontWeight: '700', fontSize: 17 * fs }}>
                {editItem ? 'تعديل مساعد' : 'إضافة مساعد'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}
                style={[S.saveBtn, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> :
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 * fs }}>حفظ</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled"
              contentContainerStyle={[S.modalBody, { paddingBottom: 40 + insets.bottom }]}>
              {[
                { key: 'fullName', label: 'الاسم الكامل *', ph: 'سارة علي الخفاجي' },
                { key: 'username', label: 'اسم المستخدم *', ph: 'assistant1' },
                { key: 'password', label: editItem ? 'كلمة مرور جديدة (اتركها فارغة)' : 'كلمة المرور *', ph: '••••••••' },
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

              <Text style={[S.label, { color: c.foreground, fontSize: 13 * fs }]}>الأستاذ المرتبط *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, flexDirection: 'row-reverse', paddingBottom: 4 }}>
                {teachers.map(t => (
                  <TouchableOpacity key={t.id} onPress={() => setSelectedTeacherId(t.id)}
                    style={[S.chip, {
                      backgroundColor: selectedTeacherId === t.id ? c.primary : c.muted,
                      borderColor: selectedTeacherId === t.id ? c.primary : c.border,
                    }]}>
                    <Text style={{ color: selectedTeacherId === t.id ? '#fff' : c.foreground, fontSize: 12 * fs }}>
                      {t.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, padding: 12 },
  cardLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1, gap: 2 },
  name: { fontWeight: '700', textAlign: 'right' },
  sub: { textAlign: 'right' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  iconBtn: { padding: 6 },
  empty: { alignItems: 'center', gap: 12, marginTop: 80 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  modalBody: { padding: 16, gap: 8 },
  label: { textAlign: 'right', fontWeight: '600', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
});
