import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

function useStudentAdminDetail(id: number, adminToken: string | undefined) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';
  return useQuery<{
    id: number; fullName: string; username: string; phone: string;
    gradeLevel: string; isActive: boolean; notes: string | null;
    courses: { id: number; title: string }[];
    parent: { id: number; fullName: string; username: string; phone: string } | null;
  }>({
    queryKey: ['admin-student-detail', id],
    queryFn: async () => {
      const res = await fetch(`${base}/api/mobile/admin/students/${id}`, {
        headers: { 'x-admin-token': adminToken ?? '' },
      });
      if (!res.ok) throw new Error('فشل');
      return res.json();
    },
    enabled: !!adminToken && !!id,
  });
}

const GRADE_LEVELS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];

export default function AdminStudentDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = parseInt(id, 10);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const adminToken = (user as any)?.adminToken;
  const qc = useQueryClient();

  const { data: student, isLoading, refetch } = useStudentAdminDetail(studentId, adminToken);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', gradeLevel: '', notes: '' });
  const [showAddParent, setShowAddParent] = useState(false);
  const [parentForm, setParentForm] = useState({ fullName: '', username: '', password: '', phone: '' });

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';

  const startEdit = () => {
    if (!student) return;
    setForm({
      fullName: student.fullName,
      username: student.username,
      password: '',
      phone: student.phone,
      gradeLevel: student.gradeLevel,
      notes: student.notes ?? '',
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    try {
      const res = await fetch(`${base}/api/mobile/admin/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify({ ...form }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditMode(false);
      qc.invalidateQueries({ queryKey: ['admin-student-detail', studentId] });
      qc.invalidateQueries({ queryKey: ['admin-students'] });
      refetch();
    } catch (e: any) { Alert.alert('خطأ', e.message); }
  };

  const saveParent = async () => {
    if (!parentForm.fullName || !parentForm.username || !parentForm.password) {
      Alert.alert('خطأ', 'الاسم واسم الدخول وكلمة المرور مطلوبة');
      return;
    }
    try {
      const res = await fetch(`${base}/api/mobile/admin/students/${studentId}/parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify(parentForm),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddParent(false);
      setParentForm({ fullName: '', username: '', password: '', phone: '' });
      refetch();
    } catch (e: any) { Alert.alert('خطأ', e.message); }
  };

  if (isLoading || !student) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs }]}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-forward" size={24} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 18 * fs, flex: 1, textAlign: 'center' }]}>
          {student.fullName}
        </Text>
        <TouchableOpacity onPress={startEdit}>
          <Ionicons name="create-outline" size={22} color={c.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>معلومات الطالب</Text>
          {[
            { label: 'الاسم', value: student.fullName },
            { label: 'اسم الدخول', value: `@${student.username}` },
            { label: 'رقم الجوال', value: student.phone || '—' },
            { label: 'الصف', value: student.gradeLevel },
            { label: 'الحالة', value: student.isActive ? '✅ مفعّل' : '🔴 موقوف' },
          ].map(row => (
            <View key={row.label} style={styles.infoRow}>
              <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>{row.value}</Text>
              <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>{row.label}</Text>
            </View>
          ))}
          {student.notes ? (
            <View style={[styles.notesBox, { backgroundColor: `${c.primary}10`, borderColor: c.border }]}>
              <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right', lineHeight: 22 }]}>
                {student.notes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Courses */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
            الكورسات المسجّل بها ({student.courses.length})
          </Text>
          {student.courses.length === 0 ? (
            <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, textAlign: 'right' }]}>
              لم يُسجَّل في أي كورس بعد
            </Text>
          ) : (
            student.courses.map(course => (
              <View key={course.id} style={[styles.courseRow, { borderColor: c.border }]}>
                <Ionicons name="book-outline" size={16} color={c.primary} />
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 13 * fs, flex: 1, textAlign: 'right' }]}>
                  {course.title}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Parent */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.cardHeader}>
            <TouchableOpacity
              onPress={() => setShowAddParent(true)}
              style={[styles.smallAddBtn, { backgroundColor: c.primary }]}
            >
              <Ionicons name={student.parent ? 'create-outline' : 'add'} size={16} color={c.primaryForeground} />
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>
              ولي الأمر
            </Text>
          </View>
          {student.parent ? (
            <>
              {[
                { label: 'الاسم', value: student.parent.fullName },
                { label: 'اسم الدخول', value: `@${student.parent.username}` },
                { label: 'الجوال', value: student.parent.phone || '—' },
              ].map(row => (
                <View key={row.label} style={styles.infoRow}>
                  <Text style={[{ color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs }]}>{row.value}</Text>
                  <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs }]}>{row.label}</Text>
                </View>
              ))}
            </>
          ) : (
            <TouchableOpacity onPress={() => setShowAddParent(true)} style={[styles.addParentBtn, { borderColor: c.border }]}>
              <Ionicons name="person-add-outline" size={20} color={c.primary} />
              <Text style={[{ color: c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>إضافة ولي أمر</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editMode} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setEditMode(false)}>
              <Text style={[{ color: c.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>تعديل الطالب</Text>
            <TouchableOpacity onPress={saveEdit}>
              <Text style={[{ color: c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>حفظ</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {[
              { label: 'الاسم الكامل', key: 'fullName' },
              { label: 'اسم الدخول', key: 'username' },
              { label: 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)', key: 'password', secure: true },
              { label: 'رقم الجوال', key: 'phone' },
              { label: 'ملاحظات', key: 'notes', multiline: true },
            ].map(f => (
              <View key={f.key} style={{ gap: 6 }}>
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>{f.label}</Text>
                <TextInput
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  secureTextEntry={!!f.secure}
                  multiline={!!f.multiline}
                  textAlign="right"
                  style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.card, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, minHeight: f.multiline ? 80 : 48 }]}
                />
              </View>
            ))}
            {/* Grade selector */}
            <View style={{ gap: 8 }}>
              <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>الصف</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row-reverse' }}>
                {GRADE_LEVELS.map(g => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setForm(p => ({ ...p, gradeLevel: g }))}
                    style={[styles.gradePillBtn, { backgroundColor: form.gradeLevel === g ? c.primary : c.card, borderColor: form.gradeLevel === g ? c.primary : c.border }]}
                  >
                    <Text style={[{ color: form.gradeLevel === g ? c.primaryForeground : c.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Parent Modal */}
      <Modal visible={showAddParent} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setShowAddParent(false)}>
              <Text style={[{ color: c.destructive, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>إضافة ولي أمر</Text>
            <TouchableOpacity onPress={saveParent}>
              <Text style={[{ color: c.primary, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}>حفظ</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {[
              { label: 'اسم ولي الأمر *', key: 'fullName', placeholder: 'الاسم الكامل' },
              { label: 'اسم الدخول *', key: 'username', placeholder: 'مثال: parent1' },
              { label: 'كلمة المرور *', key: 'password', placeholder: 'كلمة المرور', secure: true },
              { label: 'رقم الجوال', key: 'phone', placeholder: 'اختياري' },
            ].map(f => (
              <View key={f.key} style={{ gap: 6 }}>
                <Text style={[{ color: c.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 13 * fs, textAlign: 'right' }]}>{f.label}</Text>
                <TextInput
                  value={(parentForm as any)[f.key]}
                  onChangeText={v => setParentForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry={!!f.secure}
                  textAlign="right"
                  style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.card, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, minHeight: 48 }]}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 10 },
  sectionTitle: { textAlign: 'right' },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  smallAddBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.2)' },
  notesBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 },
  courseRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5 },
  addParentBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', marginTop: 4 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top' },
  gradePillBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
