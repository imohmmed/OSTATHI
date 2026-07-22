/**
 * admin/new-subject.tsx — صفحة إضافة مادة جديدة (أدمن)
 */
import React, { useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { PageHeader } from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

const GRADE_LEVELS = [
  'ثالث متوسط',
  'رابع اعدادي - علمي', 'رابع اعدادي - ادبي',
  'خامس اعدادي - علمي', 'خامس اعدادي - ادبي',
  'سادس اعدادي - علمي', 'سادس اعدادي - ادبي',
];

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
  const FileSystem = await import('expo-file-system/legacy');
  const data = await (FileSystem.readAsStringAsync ?? FileSystem.default.readAsStringAsync)(uri, { encoding: 'base64' as any });
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp' };
  return { data, mimeType: mimeMap[ext] ?? 'image/jpeg' };
}

export default function NewSubjectScreen() {
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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleGrade = (g: string) =>
    setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('تنبيه', 'يجب السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('خطأ', 'اسم المادة مطلوب'); return; }
    if (selectedGrades.length === 0) { Alert.alert('خطأ', 'اختر صفاً دراسياً على الأقل'); return; }
    setSaving(true);
    try {
      let imageUrl: string | null = null;
      if (imageUri) {
        const { data, mimeType } = await readImageBase64(imageUri);
        const up = await fetch(`${base}/api/upload/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, mimeType, filename: 'subject' }),
        });
        if (!up.ok) throw new Error('فشل رفع الصورة');
        imageUrl = `${base}${(await up.json()).url}`;
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
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'فشل إنشاء المادة');
      const subject = await res.json();
      if (imageUrl && !subject.imageUrl) {
        await fetch(`${base}/api/subjects/${subject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken ?? '' },
          body: JSON.stringify({ imageUrl }),
        });
      }
      qc.invalidateQueries({ queryKey: ['getSubjects'] });
      Alert.alert('تم', 'تمت إضافة المادة بنجاح');
      router.back();
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="إضافة مادة جديدة"
        onBack={() => router.back()}
        backgroundColor={colors.background}
        tintColor={colors.foreground}
        borderColor={colors.border}
        right={
          <TouchableOpacity
            onPress={handleCreate}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }}>حفظ</Text>}
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Tajawal_700Bold', fontSize: 11 * fs }]}>
            صورة المادة (مربعة)
          </Text>
          <TouchableOpacity onPress={pickImage} style={[styles.imagePicker, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePickerImg} resizeMode="cover" />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="camera-outline" size={30} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Tajawal_400Regular', fontSize: 12 * fs, marginTop: 6, textAlign: 'center' }}>
                  اضغط لاختيار صورة مربعة
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>اسم المادة *</Text>
          <TextInput
            value={name} onChangeText={setName} placeholder="مثال: الرياضيات"
            placeholderTextColor={colors.mutedForeground} textAlign="right"
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
          />

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Tajawal_700Bold', fontSize: 14 * fs }]}>الوصف (اختياري)</Text>
          <TextInput
            value={description} onChangeText={setDescription} placeholder="وصف مختصر عن المادة"
            placeholderTextColor={colors.mutedForeground} textAlign="right" multiline
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top', backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Tajawal_400Regular', fontSize: 15 * fs }]}
          />

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
                  style={[styles.gradeChip, {
                    backgroundColor: selected ? colors.primary : colors.muted,
                    borderColor: selected ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={{
                    color: selected ? '#fff' : colors.foreground,
                    fontFamily: selected ? 'Tajawal_700Bold' : 'Tajawal_400Regular',
                    fontSize: 13 * fs,
                  }}>{gl}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, gap: 10 },
  sectionLabel: { letterSpacing: 0.4, textAlign: 'right' },
  label: { textAlign: 'right', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  imagePicker: { width: 130, height: 130, borderRadius: 16, borderWidth: 1, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagePickerImg: { width: '100%', height: '100%' },
  gradesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  gradeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 18, minWidth: 60, alignItems: 'center' },
});
