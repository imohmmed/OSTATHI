/**
 * subjects.tsx — قائمة المواد الدراسية
 * Admin: زر + لإضافة مادة جديدة (modal)
 */
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { PageHeader } from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGetSubjects } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

const SUBJECT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

// الصفوف الثابتة للمنصة
const GRADE_LEVELS = [
  'ثالث متوسط',
  'رابع اعدادي - علمي',
  'رابع اعدادي - ادبي',
  'خامس اعدادي - علمي',
  'خامس اعدادي - ادبي',
  'سادس اعدادي - علمي',
  'سادس اعدادي - ادبي',
];

function parseGradeLevels(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw ? [raw] : []; }
}

// ── helper: قراءة صورة كـ base64 ──────────────────────────────────────────
async function readImageBase64(uri: string): Promise<{ data: string; mimeType: string }> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(',')[1];
        resolve({ data: b64, mimeType: blob.type || 'image/jpeg' });
      };
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

async function uploadImage(uri: string, domain: string | undefined): Promise<string> {
  const base = domain ? `https://${domain}` : '';
  const { data, mimeType } = await readImageBase64(uri);
  const res = await fetch(`${base}/api/upload/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, mimeType, filename: 'subject' }),
  });
  if (!res.ok) throw new Error('فشل رفع الصورة');
  const json = await res.json();
  return json.url as string;
}

export default function SubjectsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useApp();
  const { user } = useAuth();
  const fs = fontScale;
  const qc = useQueryClient();

  const adminToken = (user as any)?.adminToken;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : '';

  const { data: subjects, isLoading } = useGetSubjects();

  // ── Add modal state ───────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName(''); setDescription(''); setSelectedGrades([]); setImageUri(null);
  };

  const toggleGrade = (g: string) => {
    setSelectedGrades(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('تنبيه', 'يجب السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1], // مربعة
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('خطأ', 'اسم المادة مطلوب'); return; }
    if (selectedGrades.length === 0) { Alert.alert('خطأ', 'اختر صفاً دراسياً على الأقل'); return; }

    setSaving(true);
    try {
      let imageUrl: string | null = null;
      if (imageUri) {
        const relUrl = await uploadImage(imageUri, domain);
        imageUrl = `${base}${relUrl}`;
      }

      const res = await fetch(`${base}/api/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify({
          name: name.trim(),
          gradeLevel: selectedGrades[0],
          gradeLevels: JSON.stringify(selectedGrades),
          description: description.trim() || null,
          imageUrl,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل');
      const subject = await res.json();

      // Update imageUrl if needed
      if (imageUrl && !subject.imageUrl) {
        await fetch(`${base}/api/subjects/${subject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
          body: JSON.stringify({ imageUrl }),
        });
      }

      qc.invalidateQueries({ queryKey: ['getSubjects'] });
      setShowAdd(false);
      resetForm();
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // ── render subject card ───────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const accent = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    const hasImage = !!item.imageUrl;
    const grades = parseGradeLevels(item.gradeLevels);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/subject/${item.id}` as any)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.82}
      >
        {hasImage ? (
          <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: accent + '20' }]}>
            {item.icon ? (
              <Text style={styles.iconEmoji}>{item.icon}</Text>
            ) : (
              <Ionicons name="book-outline" size={32} color={accent} />
            )}
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text
            style={[styles.name, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {(grades.length > 0 || item.gradeLevel) && (
            <Text
              style={[styles.grade, { color: accent, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}
              numberOfLines={1}
            >
              {grades.length > 1 ? `${grades.length} صفوف` : (grades[0] || item.gradeLevel)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="المواد الدراسية"
        onBack={() => router.back()}
        backgroundColor={colors.background}
        tintColor={colors.foreground}
        borderColor={colors.border}
        right={
          adminToken ? (
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={subjects ?? []}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.list, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}>
                لا توجد مواد دراسية
              </Text>
            </View>
          }
        />
      )}

      {/* ── Add Subject Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowAdd(false); resetForm(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
              </TouchableOpacity>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>إضافة مادة جديدة</Text>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={saving}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>حفظ</Text>
                }
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.modalBody, { paddingBottom: 40 + insets.bottom }]}
            >
              {/* صورة مربعة */}
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 11 * fs }]}>
                صورة المادة (مربعة)
              </Text>
              <TouchableOpacity
                onPress={pickImage}
                style={[styles.squareImagePicker, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.squareImagePickerImg} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={30} color={colors.mutedForeground} />
                    <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, marginTop: 6, textAlign: 'center' }]}>
                      اضغط لاختيار صورة مربعة
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* اسم المادة */}
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>اسم المادة *</Text>
              <TextInput
                value={name} onChangeText={setName} placeholder="مثال: الرياضيات"
                placeholderTextColor={colors.mutedForeground} textAlign="right"
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
              />

              {/* الصفوف الدراسية - multi select */}
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>
                الصفوف التابعة لهذه المادة *
              </Text>
              <View style={styles.gradesGrid}>
                {GRADE_LEVELS.map(gl => {
                  const selected = selectedGrades.includes(gl);
                  return (
                    <TouchableOpacity
                      key={gl}
                      onPress={() => toggleGrade(gl)}
                      style={[
                        styles.gradeChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.muted,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {selected && (
                        <Ionicons name="checkmark" size={12} color="#fff" style={{ marginLeft: 2 }} />
                      )}
                      <Text style={[{
                        color: selected ? '#fff' : colors.foreground,
                        fontFamily: 'Tajawal_500Medium',
                        fontSize: 12 * fs,
                      }]}>
                        {gl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedGrades.length > 0 && (
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs, textAlign: 'right', marginTop: 4 }]}>
                  ✓ {selectedGrades.length} صف{selectedGrades.length > 1 ? 'وف' : ''} مختار{selectedGrades.length > 1 ? 'ة' : ''}
                </Text>
              )}

              {/* وصف */}
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>وصف (اختياري)</Text>
              <TextInput
                value={description} onChangeText={setDescription} placeholder="وصف مختصر للمادة..."
                placeholderTextColor={colors.mutedForeground} textAlign="right"
                multiline numberOfLines={3}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 14 * fs, minHeight: 80, textAlignVertical: 'top' }]}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, gap: 12 },
  row: { gap: 12, flexDirection: 'row-reverse' },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 180,
  },
  cardImage: { width: '100%', aspectRatio: 1 },
  iconWrap: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 40 },
  cardInfo: { padding: 10, gap: 3, alignItems: 'center' },
  name: { textAlign: 'center' },
  grade: { textAlign: 'center' },
  emptyWrap: { alignItems: 'center', gap: 12, marginTop: 80 },
  emptyText: { textAlign: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  // modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  modalBody: { padding: 16, gap: 10 },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'right',
  },
  label: { textAlign: 'right', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  // square image picker
  squareImagePicker: {
    width: 140,
    height: 140,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignSelf: 'center',
    marginVertical: 8,
  },
  squareImagePickerImg: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  // grade chips grid
  gradesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  gradeChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});
