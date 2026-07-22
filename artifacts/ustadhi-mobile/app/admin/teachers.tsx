/**
 * admin/teachers.tsx — إدارة الأساتذة (للأدمن)
 * قائمة + إضافة + تعديل + حذف
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

const GRADE_LEVELS = [
  'سادس ابتدائي',
  'اول متوسط', 'ثاني متوسط', 'ثالث متوسط',
  'رابع اعدادي علمي', 'رابع اعدادي ادبي',
  'خامس اعدادي علمي', 'خامس اعدادي ادبي',
  'سادس اعدادي علمي', 'سادس اعدادي ادبي',
];

interface Teacher {
  id: number;
  fullName: string;
  username: string;
  phone: string;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  subjects: { id: number; name: string; icon: string | null }[];
}

export default function AdminTeachersScreen() {
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

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);

  // Form state
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', bio: '' });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: teachers = [], isLoading, refetch, isRefetching } = useQuery<Teacher[]>({
    queryKey: ['admin-teachers', search],
    queryFn: async () => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${base}/api/mobile/admin/teachers${q}`, {
        headers: { 'x-admin-token': adminToken ?? '' },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!adminToken,
  });

  const resetForm = () => {
    setForm({ fullName: '', username: '', password: '', phone: '', bio: '' });
    setSelectedGrades([]);
    setEditTeacher(null);
  };

  const openEdit = (t: Teacher) => {
    setEditTeacher(t);
    setForm({ fullName: t.fullName, username: t.username, password: '', phone: t.phone ?? '', bio: t.bio ?? '' });
    setSelectedGrades([]);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.username.trim()) {
      Alert.alert('خطأ', 'الاسم واسم المستخدم مطلوبان');
      return;
    }
    if (!editTeacher && !form.password.trim()) {
      Alert.alert('خطأ', 'كلمة المرور مطلوبة');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim() || null,
        gradeLevels: selectedGrades,
      };
      if (form.password.trim()) body.password = form.password.trim();

      let res: Response;
      if (editTeacher) {
        res = await fetch(`${base}/api/mobile/admin/teachers/${editTeacher.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
          body: JSON.stringify(body),
        });
      } else {
        body.password = form.password.trim();
        res = await fetch(`${base}/api/mobile/admin/teachers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'فشل');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin-teachers'] });
      setShowAdd(false);
      resetForm();
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (t: Teacher) => {
    Alert.alert(
      'حذف الأستاذ',
      `هل أنت متأكد من حذف "${t.fullName}"؟ سيُحذف مع كل بياناته.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${base}/api/mobile/admin/teachers/${t.id}`, {
                method: 'DELETE',
                headers: { 'x-admin-token': adminToken ?? '' },
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              qc.invalidateQueries({ queryKey: ['admin-teachers'] });
            } catch {
              Alert.alert('خطأ', 'فشل الحذف');
            }
          },
        },
      ]
    );
  };

  const toggleGrade = (gl: string) => {
    setSelectedGrades(prev =>
      prev.includes(gl) ? prev.filter(g => g !== gl) : [...prev, gl]
    );
  };

  const renderTeacher = ({ item }: { item: Teacher }) => (
    <View style={[S.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={S.cardLeft}>
        <View style={[S.avatar, { backgroundColor: c.primary + '20' }]}>
          <Text style={[S.avatarText, { color: c.primary }]}>
            {item.fullName.charAt(0)}
          </Text>
        </View>
        <View style={S.cardInfo}>
          <Text style={[S.cardName, { color: c.foreground, fontSize: 15 * fs }]} numberOfLines={1}>
            {item.fullName}
          </Text>
          <Text style={[S.cardSub, { color: c.mutedForeground, fontSize: 12 * fs }]}>
            @{item.username} {item.phone ? `• ${item.phone}` : ''}
          </Text>
          {item.subjects.length > 0 && (
            <Text style={[S.cardSub, { color: c.primary, fontSize: 11 * fs }]} numberOfLines={1}>
              {item.subjects.map(s => s.icon ? `${s.icon} ${s.name}` : s.name).join(' ، ')}
            </Text>
          )}
        </View>
      </View>
      <View style={S.cardActions}>
        <View style={[S.statusDot, { backgroundColor: item.isActive ? '#22c55e' : '#ef4444' }]} />
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
        title="إدارة الأساتذة"
        onBack={() => router.back()}
        backgroundColor={c.background}
        tintColor={c.foreground}
        borderColor={c.border}
        right={
          <TouchableOpacity
            onPress={() => { resetForm(); setShowAdd(true); }}
            style={[S.addBtn, { backgroundColor: c.primary }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={[S.searchWrap, { borderColor: c.border, backgroundColor: c.card }]}>
        <Ionicons name="search-outline" size={18} color={c.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="بحث باسم الأستاذ أو المعرف..."
          placeholderTextColor={c.mutedForeground}
          style={[S.searchInput, { color: c.foreground, fontSize: 14 * fs }]}
          textAlign="right"
          returnKeyType="search"
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
          data={teachers}
          keyExtractor={t => String(t.id)}
          renderItem={renderTeacher}
          contentContainerStyle={{ padding: 12, paddingBottom: 60 + insets.bottom, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} />}
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name="person-outline" size={48} color={c.mutedForeground} />
              <Text style={[{ color: c.mutedForeground, fontSize: 15 * fs, textAlign: 'center' }]}>
                لا يوجد أساتذة
              </Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowAdd(false); resetForm(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[S.modal, { backgroundColor: c.background }]}>
            <View style={[S.modalHeader, { borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
                <Text style={{ color: c.mutedForeground, fontSize: 15 * fs }}>إلغاء</Text>
              </TouchableOpacity>
              <Text style={{ color: c.foreground, fontWeight: '700', fontSize: 17 * fs }}>
                {editTeacher ? 'تعديل الأستاذ' : 'إضافة أستاذ'}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[S.saveBtn, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 * fs }}>حفظ</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[S.modalBody, { paddingBottom: 40 + insets.bottom }]}>
              {[
                { key: 'fullName', label: 'الاسم الكامل *', placeholder: 'أحمد محمد الشمري' },
                { key: 'username', label: 'اسم المستخدم *', placeholder: 'teacher1' },
                { key: 'password', label: editTeacher ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور *', placeholder: '••••••••' },
                { key: 'phone', label: 'رقم الهاتف', placeholder: '07xxxxxxxxx' },
                { key: 'bio', label: 'نبذة', placeholder: 'خبرة في تدريس الرياضيات...' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={[S.label, { color: c.foreground, fontSize: 13 * fs }]}>{f.label}</Text>
                  <TextInput
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={c.mutedForeground}
                    secureTextEntry={f.key === 'password'}
                    textAlign="right"
                    style={[S.input, { backgroundColor: c.card, borderColor: c.border, color: c.foreground, fontSize: 14 * fs }]}
                  />
                </View>
              ))}

              <Text style={[S.label, { color: c.foreground, fontSize: 13 * fs }]}>الصفوف الدراسية</Text>
              <View style={S.gradeWrap}>
                {GRADE_LEVELS.map(gl => (
                  <TouchableOpacity
                    key={gl}
                    onPress={() => toggleGrade(gl)}
                    style={[S.gradeChip, {
                      backgroundColor: selectedGrades.includes(gl) ? c.primary : c.muted,
                      borderColor: selectedGrades.includes(gl) ? c.primary : c.border,
                    }]}
                  >
                    <Text style={{ color: selectedGrades.includes(gl) ? '#fff' : c.foreground, fontSize: 11 * fs }}>
                      {gl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  searchWrap: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 0 },
  card: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, borderWidth: 1, padding: 12,
  },
  cardLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontWeight: '700', textAlign: 'right' },
  cardSub: { textAlign: 'right' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  iconBtn: { padding: 6 },
  empty: { alignItems: 'center', gap: 12, marginTop: 80 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  modalBody: { padding: 16, gap: 8 },
  label: { textAlign: 'right', fontWeight: '600', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  gradeWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  gradeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
});
