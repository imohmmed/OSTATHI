import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-fetch';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Search, BookOpen, Upload, X } from 'lucide-react';
import { Link } from 'wouter';

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

export default function SubjectsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '' });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: subjects = [], isLoading } = useQuery<any[]>({
    queryKey: ['subjects'],
    queryFn: () => adminFetch<any[]>('/api/subjects'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = form.imageUrl;
      if (imageFile) {
        setUploading(true);
        const base64 = await toBase64(imageFile);
        const res = await adminFetch<any>('/api/upload/image', {
          method: 'POST',
          body: JSON.stringify({ data: base64.split(',')[1], mimeType: imageFile.type, filename: 'subject' }),
        });
        imageUrl = res.url;
        setUploading(false);
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: imageUrl || null,
        gradeLevel: selectedGrades[0] ?? '',
        gradeLevels: JSON.stringify(selectedGrades),
      };
      if (editId) {
        return adminFetch(`/api/subjects/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        return adminFetch('/api/subjects', { method: 'POST', body: JSON.stringify(payload) });
      }
    },
    onSuccess: () => {
      toast({ title: editId ? 'تم التحديث' : 'تمت الإضافة' });
      qc.invalidateQueries({ queryKey: ['subjects'] });
      closeDialog();
    },
    onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/subjects/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast({ title: 'تم الحذف' }); qc.invalidateQueries({ queryKey: ['subjects'] }); },
  });

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', description: '', imageUrl: '' });
    setSelectedGrades([]);
    setImageFile(null); setImagePreview('');
    setOpen(true);
  };

  const openEdit = (sub: any) => {
    setEditId(sub.id);
    setForm({ name: sub.name, description: sub.description || '', imageUrl: sub.imageUrl || '' });
    setSelectedGrades(parseGradeLevels(sub.gradeLevels));
    setImageFile(null);
    setImagePreview(sub.imageUrl || '');
    setOpen(true);
  };

  const closeDialog = () => { setOpen(false); setEditId(null); setImageFile(null); setImagePreview(''); };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleGrade = (g: string) =>
    setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const filtered = subjects.filter((s: any) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">المواد الدراسية</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." className="pr-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button className="gap-2 shrink-0" onClick={openAdd}>
            <Plus className="w-4 h-4" /> إضافة مادة
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-3xl bg-muted animate-pulse aspect-[3/4]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>لا توجد مواد دراسية بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((sub: any) => {
            const grades = parseGradeLevels(sub.gradeLevels);
            return (
              <div key={sub.id} className="group relative rounded-3xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
                {/* Square image */}
                <div className="aspect-square bg-muted overflow-hidden">
                  {sub.imageUrl ? (
                    <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 space-y-2">
                  <Link href={`/admin/subjects/${sub.id}`}>
                    <p className="font-bold text-base text-center hover:text-primary cursor-pointer">{sub.name}</p>
                  </Link>
                  {grades.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {grades.slice(0, 2).map((g: string) => (
                        <Badge key={g} variant="outline" className="text-[10px] px-1.5 py-0">{g}</Badge>
                      ))}
                      {grades.length > 2 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted">+{grades.length - 2}</Badge>
                      )}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(sub)}
                    className="w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 shadow flex items-center justify-center hover:bg-blue-50"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-500" />
                  </button>
                  <button
                    onClick={() => { if (confirm('حذف هذه المادة؟')) deleteMutation.mutate(sub.id); }}
                    className="w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 shadow flex items-center justify-center hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={v => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل المادة' : 'إضافة مادة جديدة'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Square image upload */}
            <div>
              <label className="text-sm font-medium block mb-2">صورة المادة (مربعة)</label>
              <div className="relative">
                {imagePreview ? (
                  <div className="relative aspect-square w-40 mx-auto rounded-2xl overflow-hidden border border-border">
                    <img src={imagePreview} className="w-full h-full object-cover" alt="preview" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(''); setForm(p => ({ ...p, imageUrl: '' })); }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="aspect-square w-40 mx-auto flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-muted/40 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">ارفع صورة مربعة</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  </label>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم المادة *</label>
              <Input
                placeholder="مثال: الرياضيات"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium">وصف (اختياري)</label>
              <Input
                placeholder="وصف قصير للمادة..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Grade levels multi-select */}
            <div>
              <label className="text-sm font-medium block mb-2">الصفوف التابعة لهذه المادة *</label>
              <div className="grid grid-cols-2 gap-2 border border-border rounded-2xl p-4 bg-muted/20">
                {GRADE_LEVELS.map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer py-1">
                    <Checkbox
                      checked={selectedGrades.includes(g)}
                      onCheckedChange={() => toggleGrade(g)}
                    />
                    <span className="text-sm">{g}</span>
                  </label>
                ))}
              </div>
              {selectedGrades.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedGrades.map(g => (
                    <Badge key={g} variant="secondary" className="gap-1 text-xs">
                      {g}
                      <button onClick={() => toggleGrade(g)}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || uploading || !form.name.trim() || selectedGrades.length === 0}
            >
              {(saveMutation.isPending || uploading) ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
