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

const GRADE_LEVELS = [
  'سادس ابتدائي',
  'اول متوسط', 'ثاني متوسط', 'ثالث متوسط',
  'رابع اعدادي علمي', 'رابع اعدادي ادبي',
  'خامس اعدادي علمي', 'خامس اعدادي ادبي',
  'سادس اعدادي علمي', 'سادس اعدادي ادبي',
];

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

// ── upload image to server ────────────────────────────────────────────────
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
  const [icon, setIcon] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName(''); setIcon(''); setGradeLevel(''); setDescription(''); setImageUri(null);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('تنبيه', 'يجب السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('خطأ', 'اسم المادة مطلوب'); return; }
    if (!gradeLevel) { Alert.alert('خطأ', 'اختر الصف الدراسي'); return; }

    setSaving(true);
    try {
      // رفع الصورة أولاً إن وُجدت
      let imageUrl: string | null = null;
      if (imageUri) {
        imageUrl = `${base}${await uploadImage(imageUri, domain)}`;
      }

      const res = await fetch(`${base}/api/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
        body: JSON.stringify({ name: name.trim(), icon: icon.trim() || null, gradeLevel, description: description.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل');
      const subject = await res.json();

      // رفع الصورة بعد الإنشاء
      if (imageUrl) {
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
        {/* اسم المادة يظهر دائماً تحت الصورة */}
        <View style={styles.cardInfo}>
          <Text
            style={[styles.name, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 15 * fs }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {item.gradeLevel ? (
            <Text
              style={[styles.grade, { color: accent, fontFamily: 'Tajawal_400Regular', fontSize: 11 * fs }]}
              numberOfLines={1}
            >
              {item.gradeLevel}
            </Text>
          ) : null}
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
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowAdd(false); resetForm(); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
                <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_500Medium', fontSize: 15 * fs }]}>إلغاء</Text>
              </TouchableOpacity>
              <Text style={[{ color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 17 * fs }]}>إضافة مادة</Text>
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
              {/* صورة المادة */}
              <TouchableOpacity onPress={pickImage} style={[styles.imagePicker, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePickerImg} resizeMode="cover" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={32} color={colors.mutedForeground} />
                    <Text style={[{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 13 * fs, marginTop: 6 }]}>
                      اضغط لاختيار صورة المادة
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* اسم المادة */}
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>اسم المادة *</Text>
              <TextInput
                value={name} onChangeText={setName} placeholder="مثال: الرياضيات"
                placeholderTextColor={colors.mutedForeground} textAlign="right"
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
              />

              {/* أيقونة */}
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>أيقونة (إيموجي)</Text>
              <TextInput
                value={icon} onChangeText={setIcon} placeholder="📚"
                placeholderTextColor={colors.mutedForeground} textAlign="center"
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 24 * fs, textAlign: 'center', width: 80 }]}
              />

              {/* الصف الدراسي */}
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>الصف الدراسي *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row-reverse', paddingBottom: 4 }}>
                {GRADE_LEVELS.map(gl => (
                  <TouchableOpacity
                    key={gl}
                    onPress={() => setGradeLevel(gl)}
                    style={[styles.gradeChip, {
                      backgroundColor: gradeLevel === gl ? colors.primary : colors.muted,
                      borderColor: gradeLevel === gl ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[{ color: gradeLevel === gl ? '#fff' : colors.foreground, fontFamily: 'Tajawal_500Medium', fontSize: 12 * fs }]}>
                      {gl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* وصف */}
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>وصف (اختياري)</Text>
              <TextInput
                value={description} onChangeText={setDescription} placeholder="وصف المادة..."
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
  cardImage: {
    width: '100%',
    aspectRatio: 1,
  },
  iconWrap: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 40 },
  cardInfo: {
    padding: 10,
    gap: 3,
    alignItems: 'center',
  },
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
  label: { textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  imagePicker: {
    height: 160,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  imagePickerImg: { width: '100%', height: '100%' },
  gradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
});
