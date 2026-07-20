import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

const GRADE_LEVELS = [
  'سادس ابتدائي',
  'اول متوسط', 'ثاني متوسط', 'ثالث متوسط',
  'رابع اعدادي علمي', 'رابع اعدادي ادبي',
  'خامس اعدادي علمي', 'خامس اعدادي ادبي',
  'سادس اعدادي علمي', 'سادس اعدادي ادبي',
];

interface TeacherFull {
  id: number;
  fullName: string;
  username: string;
  phone: string;
  bio: string;
  avatarUrl: string | null;
  isActive: boolean;
  gradeLevels: string[];
  subjects: { id: number; name: string; icon: string | null }[];
}

interface SubjectItem { id: number; name: string; icon: string | null; gradeLevel: string | null; }

export default function AdminTeacherDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const { id } = useLocalSearchParams<{ id: string }>();
  const teacherId = parseInt(id, 10);
  const adminToken = (user as any)?.adminToken;
  const qc = useQueryClient();

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';

  // Fetch teacher
  const { data: teacher, isLoading, refetch } = useQuery<TeacherFull>({
    queryKey: ['admin-teacher', teacherId],
    queryFn: async () => {
      const res = await fetch(`${base}/api/mobile/admin/teachers/${teacherId}`, {
        headers: { 'x-admin-token': adminToken ?? '' },
      });
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    enabled: !!adminToken && !!teacherId,
  });

  // Fetch all subjects for picker
  const { data: allSubjects = [] } = useQuery<SubjectItem[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await fetch(`${base}/api/subjects`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '', username: '', password: '', phone: '',
    bio: '', avatarUrl: '', isActive: true,
  });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);

  const startEdit = () => {
    if (!teacher) return;
    setForm({
      fullName: teacher.fullName,
      username: teacher.username,
      password: '',
      phone: teacher.phone,
      bio: teacher.bio ?? '',
      avatarUrl: teacher.avatarUrl ?? '',
      isActive: teacher.isActive,
    });
    setSelectedGrades(teacher.gradeLevels ?? []);
    setSelectedSubjectIds((teacher.subjects ?? []).map(s => s.id));
    setEditMode(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('خطأ', 'يجب منح إذن الوصول للصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
      setForm(p => ({ ...p, avatarUrl: dataUrl }));
    }
  };

  const toggleGrade = (g: string) =>
    setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const toggleSubject = (id: number) =>
    setSelectedSubjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const saveEdit = async () => {
    if (!form.fullName || !form.username) {
      Alert.alert('خطأ', 'الاسم واسم الدخول مطلوبان');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${base}/api/mobile/admin/teachers/${teacherId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify({
          ...form,
          gradeLevels: selectedGrades,
          subjectIds: selectedSubjectIds,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditMode(false);
      qc.invalidateQueries({ queryKey: ['admin-teacher', teacherId] });
      qc.invalidateQueries({ queryKey: ['admin-subject'] });
      refetch();
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const avatarSrc = editMode ? form.avatarUrl : teacher?.avatarUrl;

  if (isLoading || !teacher) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'الأستاذ', headerBackTitle: 'رجوع' }} />
        <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: teacher.fullName, headerBackTitle: 'رجوع' }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>

        {/* ── Hero image (rectangular 16:9) ── */}
        <View style={styles.heroWrapper}>
          {avatarSrc ? (
            <Image source={{ uri: avatarSrc }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: `${c.primary}20` }]}>
              <Text style={{ fontSize: 60 }}>👤</Text>
            </View>
          )}
          {/* Overlay: edit button */}
          <TouchableOpacity
            onPress={startEdit}
            style={[styles.editOverlayBtn, { backgroundColor: c.primary }]}
          >
            <Ionicons name="create-outline" size={18} color={c.primaryForeground} />
            <Text style={[{ color: c.primaryForeground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>تعديل</Text>
          </TouchableOpacity>
          {/* Active badge */}
          <View style={[styles.activeBadge, { backgroundColor: teacher.isActive ? '#10b981' : '#ef4444' }]}>
            <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 11 * fs }]}>
              {teacher.isActive ? 'مفعّل' : 'موقوف'}
            </Text>
          </View>
        </View>

        {/* ── Info section ── */}
        <View style={{ padding: 16, gap: 12 }}>

          {/* Name & username */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.foreground, fontSize: 15 * fs }]}>المعلومات الأساسية</Text>
            {[
              { label: 'الاسم', value: teacher.fullName },
              { label: 'اسم الدخول', value: `@${teacher.username}` },
              { label: 'رقم الجوال', value: teacher.phone || '—' },
            ].map(row => (
              <View key={row.label} style={[styles.infoRow, { borderColor: c.border }]}>
                <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>{row.value}</Text>
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>{row.label}</Text>
              </View>
            ))}
            {teacher.bio ? (
              <View style={[styles.bioBox, { backgroundColor: `${c.primary}08`, borderColor: c.border }]}>
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', lineHeight: 22 }]}>
                  {teacher.bio}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Subjects */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.foreground, fontSize: 15 * fs }]}>
              المواد التي يدرّسها ({teacher.subjects.length})
            </Text>
            {teacher.subjects.length === 0 ? (
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right' }]}>لا توجد مواد مربوطة</Text>
            ) : (
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                {teacher.subjects.map(s => (
                  <View key={s.id} style={[styles.subjectBadge, { backgroundColor: `${c.primary}15`, borderColor: `${c.primary}40` }]}>
                    <Text style={{ fontSize: 16 }}>{s.icon ?? '📚'}</Text>
                    <Text style={[{ color: c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>{s.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Grade levels */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.foreground, fontSize: 15 * fs }]}>
              الصفوف التي يدرّسها ({teacher.gradeLevels.length})
            </Text>
            {teacher.gradeLevels.length === 0 ? (
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right' }]}>لم تُحدَّد صفوف بعد</Text>
            ) : (
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                {teacher.gradeLevels.map(g => (
                  <View key={g} style={[styles.gradeBadge, { backgroundColor: `${c.primary}12`, borderColor: `${c.primary}30` }]}>
                    <Text style={[{ color: c.primary, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>{g}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      {/* ════════════════════════════════════════
          EDIT MODAL
      ════════════════════════════════════════ */}
      <Modal visible={editMode} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: c.background }]}>

          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setEditMode(false)}>
              <Text style={[{ color: c.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>تعديل الأستاذ</Text>
            <TouchableOpacity onPress={saveEdit} disabled={isSaving}>
              <Text style={[{ color: isSaving ? c.mutedForeground : c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
                {isSaving ? '...' : 'حفظ'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* ── Image picker (16:9) ── */}
            <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
              {form.avatarUrl ? (
                <Image source={{ uri: form.avatarUrl }} style={styles.editHeroImage} resizeMode="cover" />
              ) : (
                <View style={[styles.editHeroPlaceholder, { backgroundColor: `${c.primary}15`, borderColor: c.border }]}>
                  <Ionicons name="image-outline" size={40} color={c.primary} />
                  <Text style={[{ color: c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>اختر صورة</Text>
                  <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}>16 × 9 · مستطيلة</Text>
                </View>
              )}
              {form.avatarUrl && (
                <View style={styles.changeImageBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                  <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 12 * fs }]}>تغيير</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={{ paddingHorizontal: 16, gap: 14 }}>

              {/* Text fields */}
              {[
                { label: 'الاسم الكامل *', key: 'fullName', placeholder: 'اسم الأستاذ' },
                { label: 'اسم الدخول *', key: 'username', placeholder: 'مثال: teacher1' },
                { label: 'كلمة المرور الجديدة (اتركها فارغة)', key: 'password', placeholder: '••••••••', secure: true },
                { label: 'رقم الجوال', key: 'phone', placeholder: 'اختياري' },
                { label: 'نبذة / وصف الأستاذ', key: 'bio', placeholder: 'اكتب نبذة عن الأستاذ...', multiline: true },
              ].map(f => (
                <View key={f.key} style={{ gap: 6 }}>
                  <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>{f.label}</Text>
                  <TextInput
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={c.mutedForeground}
                    secureTextEntry={!!(f as any).secure}
                    multiline={!!(f as any).multiline}
                    textAlign="right"
                    style={[styles.input, {
                      color: c.foreground, borderColor: c.border,
                      backgroundColor: c.card, fontFamily: 'Tajawal_400Regular',
                      fontSize: 14 * fs, minHeight: (f as any).multiline ? 90 : 48,
                    }]}
                  />
                </View>
              ))}

              {/* Active toggle */}
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  style={[styles.toggleBtn, { backgroundColor: form.isActive ? '#10b98120' : '#ef444420', borderColor: form.isActive ? '#10b981' : '#ef4444' }]}
                >
                  <View style={[styles.toggleDot, { backgroundColor: form.isActive ? '#10b981' : '#ef4444' }]} />
                  <Text style={[{ color: form.isActive ? '#10b981' : '#ef4444', fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>
                    {form.isActive ? 'مفعّل' : 'موقوف'}
                  </Text>
                </TouchableOpacity>
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>حالة الحساب</Text>
              </View>

              {/* Grade levels */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
                    {selectedGrades.length} مختار
                  </Text>
                  <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>الصفوف الدراسية</Text>
                </View>
                <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                  {GRADE_LEVELS.map(g => {
                    const sel = selectedGrades.includes(g);
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => toggleGrade(g)}
                        style={[styles.pillBtn, { backgroundColor: sel ? c.primary : c.card, borderColor: sel ? c.primary : c.border }]}
                      >
                        <Text style={[{ color: sel ? c.primaryForeground : c.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>{g}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Subjects */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs }]}>
                    {selectedSubjectIds.length} مادة
                  </Text>
                  <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>المواد التي يدرّسها</Text>
                </View>
                {allSubjects.map(s => {
                  const sel = selectedSubjectIds.includes(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => toggleSubject(s.id)}
                      style={[styles.subjectCheckRow, {
                        backgroundColor: sel ? `${c.primary}12` : c.card,
                        borderColor: sel ? c.primary : c.border,
                      }]}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.checkbox, { backgroundColor: sel ? c.primary : 'transparent', borderColor: sel ? c.primary : c.border }]}>
                        {sel && <Ionicons name="checkmark" size={14} color={c.primaryForeground} />}
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 22 }}>{s.icon ?? '📚'}</Text>
                        <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>{s.name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroWrapper: { width: '100%', aspectRatio: 16 / 9, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  editOverlayBtn: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  activeBadge: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  infoRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 0.5,
  },
  bioBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 },
  subjectBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
  },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  editHeroImage: { width: '100%', aspectRatio: 16 / 9 },
  editHeroPlaceholder: {
    width: '100%', aspectRatio: 16 / 9,
    alignItems: 'center', justifyContent: 'center',
    gap: 8, borderBottomWidth: 1,
  },
  changeImageBadge: {
    position: 'absolute', bottom: 10, right: 12,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top' },
  toggleBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5,
  },
  toggleDot: { width: 10, height: 10, borderRadius: 5 },
  pillBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  subjectCheckRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 16, borderWidth: 1,
  },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
