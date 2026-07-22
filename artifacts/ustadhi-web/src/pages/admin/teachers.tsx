import React, { useState, useRef } from 'react';
import {
  useGetTeachers,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
  useGetSubjects,
  getGetTeachersQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle, Upload, X, Image as ImageIcon, Link, Video, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { adminFetch } from '@/lib/admin-fetch';

const GRADE_LEVELS = [
  'ثالث متوسط',
  'رابع اعدادي - علمي',
  'رابع اعدادي - ادبي',
  'خامس اعدادي - علمي',
  'خامس اعدادي - ادبي',
  'سادس اعدادي - علمي',
  'سادس اعدادي - ادبي',
];

const teacherSchema = z.object({
  fullName: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف مطلوب'),
  username: z.string().min(3, 'اسم المستخدم مطلوب'),
  password: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().default(true),
  subjectIds: z.array(z.number()).default([]),
  gradeLevels: z.array(z.string()).default([]),
});

type FormVals = z.infer<typeof teacherSchema>;

async function uploadImageFile(file: File): Promise<string> {
  const reader = new FileReader();
  const b64 = await new Promise<string>((res, rej) => {
    reader.onload = () => res((reader.result as string).split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
  const result = await adminFetch<any>('/api/upload/image', {
    method: 'POST',
    body: JSON.stringify({ data: b64, mimeType: file.type, filename: 'teacher' }),
  });
  return result.url as string;
}

export default function TeachersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Extra fields not in the zod schema
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [trialLessonUrl, setTrialLessonUrl] = useState('');
  const [trialFile, setTrialFile] = useState<File | null>(null);
  const [trialInputMode, setTrialInputMode] = useState<'url' | 'file'>('url');
  const [saving, setSaving] = useState(false);

  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const trialRef = useRef<HTMLInputElement>(null);

  const { data: teachers, isLoading } = useGetTeachers({ search: searchTerm });
  const { data: subjects } = useGetSubjects();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormVals>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { fullName: '', phone: '', username: '', password: '', bio: '', isActive: true, subjectIds: [], gradeLevels: [] },
  });

  const resetExtras = () => {
    setAvatarFile(null); setAvatarPreview('');
    setCoverFile(null); setCoverPreview('');
    setTrialLessonUrl(''); setTrialFile(null); setTrialInputMode('url');
  };

  const onSubmit = async (values: FormVals) => {
    setSaving(true);
    try {
      // Upload images if files were picked
      let avatarUrl = (editId ? (teachers?.find(t => t.id === editId) as any)?.avatarUrl : '') || '';
      let coverImageUrl = (editId ? (teachers?.find(t => t.id === editId) as any)?.coverImageUrl : '') || '';
      let finalTrialUrl = trialLessonUrl;

      if (avatarFile) {
        const url = await uploadImageFile(avatarFile);
        avatarUrl = url;
      }
      if (coverFile) {
        const url = await uploadImageFile(coverFile);
        coverImageUrl = url;
      }
      if (trialInputMode === 'file' && trialFile) {
        // Upload video file
        const reader = new FileReader();
        const b64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(trialFile);
        });
        const result = await adminFetch<any>('/api/upload/image', {
          method: 'POST',
          body: JSON.stringify({ data: b64, mimeType: trialFile.type, filename: 'trial-lesson' }),
        });
        finalTrialUrl = result.url;
      }

      const payload: any = {
        ...values,
        avatarUrl: avatarUrl || null,
        coverImageUrl: coverImageUrl || null,
        trialLessonUrl: finalTrialUrl || null,
        trialLessonType: trialInputMode,
      };

      if (editId) {
        if (!payload.password) delete payload.password;
        updateTeacher.mutate({ id: editId, data: payload }, {
          onSuccess: () => {
            toast({ title: 'تم التحديث بنجاح' });
            queryClient.invalidateQueries({ queryKey: getGetTeachersQueryKey() });
            setIsAddOpen(false); setEditId(null); form.reset(); resetExtras();
          },
          onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
        });
      } else {
        if (!values.password) { toast({ title: 'كلمة المرور مطلوبة', variant: 'destructive' }); return; }
        createTeacher.mutate({ data: payload }, {
          onSuccess: () => {
            toast({ title: 'تمت الإضافة بنجاح' });
            queryClient.invalidateQueries({ queryKey: getGetTeachersQueryKey() });
            setIsAddOpen(false); form.reset(); resetExtras();
          },
          onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (teacher: any) => {
    setEditId(teacher.id);
    form.reset({
      fullName: teacher.fullName, phone: teacher.phone, username: teacher.username,
      bio: teacher.bio || '', isActive: teacher.isActive,
      subjectIds: teacher.subjectIds || [],
      gradeLevels: teacher.gradeLevels || [],
    });
    setAvatarFile(null); setAvatarPreview(teacher.avatarUrl || '');
    setCoverFile(null); setCoverPreview(teacher.coverImageUrl || '');
    setTrialLessonUrl(teacher.trialLessonUrl || '');
    setTrialFile(null); setTrialInputMode(teacher.trialLessonType || 'url');
    setIsAddOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      deleteTeacher.mutate({ id }, {
        onSuccess: () => { toast({ title: 'تم الحذف' }); queryClient.invalidateQueries({ queryKey: getGetTeachersQueryKey() }); },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة الأساتذة</h1>
        <div className="flex w-full sm:w-auto gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." className="pr-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open); if (!open) { setEditId(null); form.reset(); resetExtras(); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> إضافة أستاذ</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? 'تعديل بيانات الأستاذ' : 'إضافة أستاذ جديد'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  {/* ── صورة الغلاف (مستطيل عرضي) ── */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">صورة الغلاف (مستطيلة عرضية)</p>
                    <div
                      className="relative w-full aspect-[16/5] rounded-2xl border-2 border-dashed border-border bg-muted/30 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => coverRef.current?.click()}
                    >
                      {coverPreview ? (
                        <>
                          <img src={coverPreview} className="w-full h-full object-cover" alt="cover" />
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setCoverFile(null); setCoverPreview(''); }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                          <ImageIcon className="w-8 h-8 opacity-30" />
                          <span className="text-xs">اضغط لرفع صورة غلاف مستطيلة</span>
                        </div>
                      )}
                    </div>
                    <input ref={coverRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); } }} />
                  </div>

                  {/* ── صورة البروفايل (مربعة) ── */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">صورة البروفايل</p>
                    <div className="flex gap-4 items-center">
                      <div
                        className="w-20 h-20 rounded-full border-2 border-dashed border-border bg-muted/30 overflow-hidden cursor-pointer hover:bg-muted/50 flex items-center justify-center shrink-0"
                        onClick={() => avatarRef.current?.click()}
                      >
                        {avatarPreview
                          ? <img src={avatarPreview} className="w-full h-full object-cover rounded-full" alt="avatar" />
                          : <Upload className="w-6 h-6 text-muted-foreground/50" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>صورة دائرية للأستاذ</p>
                        <button type="button" onClick={() => avatarRef.current?.click()} className="text-primary underline mt-1">اختر صورة</button>
                        {avatarPreview && <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(''); }} className="text-red-500 underline mt-1 mr-2">إزالة</button>}
                      </div>
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } }} />
                  </div>

                  {/* ── بيانات الحساب ── */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">البيانات الأساسية</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem><FormLabel>اسم الأستاذ *</FormLabel><FormControl><Input placeholder="الاسم الكامل" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>رقم الهاتف *</FormLabel><FormControl><Input placeholder="07xxxxxxxxx" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="username" render={({ field }) => (
                        <FormItem><FormLabel>اسم المستخدم *</FormLabel><FormControl><Input placeholder="teacher_name" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور {editId && <span className="text-muted-foreground text-xs">(اتركها فارغة للإبقاء)</span>}</FormLabel>
                          <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <FormField control={form.control} name="bio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الأستاذ</FormLabel>
                      <FormControl><Textarea placeholder="نبذة تعريفية عن الأستاذ..." className="resize-none" rows={3} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* ── المحاضرة التجريبية ── */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">المحاضرة التجريبية (مجانية للجميع)</p>
                    <div className="border border-border rounded-2xl p-4 space-y-3 bg-muted/20">
                      {/* Mode selector */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTrialInputMode('url')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm transition-colors ${trialInputMode === 'url' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                        >
                          <Link className="w-4 h-4" /> رابط فيديو
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrialInputMode('file')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm transition-colors ${trialInputMode === 'file' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                        >
                          <Upload className="w-4 h-4" /> رفع ملف
                        </button>
                      </div>

                      {trialInputMode === 'url' ? (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">رابط mp4 أو m3u8 أو YouTube</label>
                          <Input
                            dir="ltr"
                            placeholder="https://..."
                            value={trialLessonUrl}
                            onChange={e => setTrialLessonUrl(e.target.value)}
                          />
                          {trialLessonUrl && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-xl text-xs text-muted-foreground">
                              <Video className="w-4 h-4 shrink-0" />
                              <span className="truncate" dir="ltr">{trialLessonUrl}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label
                            className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => trialRef.current?.click()}
                          >
                            {trialFile ? (
                              <>
                                <PlayCircle className="w-8 h-8 text-primary" />
                                <span className="text-sm font-medium">{trialFile.name}</span>
                                <span className="text-xs text-muted-foreground">{(trialFile.size / 1024 / 1024).toFixed(1)} MB</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-muted-foreground/50" />
                                <span className="text-sm text-muted-foreground">اضغط لرفع ملف mp4 أو mov</span>
                              </>
                            )}
                          </label>
                          <input ref={trialRef} type="file" accept="video/*,.mp4,.mov" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) setTrialFile(f); }} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 هذه المحاضرة ستظهر لجميع الزوار مجاناً في صفحة الأستاذ — بعد مشاهدتها يمكنهم التقييم
                    </p>
                  </div>

                  {/* ── المواد الدراسية ── */}
                  <FormField control={form.control} name="subjectIds" render={() => (
                    <FormItem>
                      <FormLabel>المواد الدراسية</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-xl">
                        {subjects?.map(sub => (
                          <FormField key={sub.id} control={form.control} name="subjectIds" render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(sub.id)}
                                  onCheckedChange={checked =>
                                    field.onChange(checked ? [...field.value, sub.id] : field.value.filter(v => v !== sub.id))
                                  }
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">{sub.name}</FormLabel>
                            </FormItem>
                          )} />
                        ))}
                        {!subjects?.length && <p className="text-muted-foreground text-sm col-span-3">لا توجد مواد بعد</p>}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* ── الصفوف الدراسية ── */}
                  <FormField control={form.control} name="gradeLevels" render={() => (
                    <FormItem>
                      <FormLabel>الصفوف الدراسية</FormLabel>
                      <div className="grid grid-cols-2 gap-2 border p-4 rounded-xl">
                        {GRADE_LEVELS.map(grade => (
                          <FormField key={grade} control={form.control} name="gradeLevels" render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(grade)}
                                  onCheckedChange={checked =>
                                    field.onChange(checked ? [...field.value, grade] : field.value.filter(v => v !== grade))
                                  }
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">{grade}</FormLabel>
                            </FormItem>
                          )} />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
                    <Button type="submit" disabled={saving || createTeacher.isPending || updateTeacher.isPending}>
                      {(saving || createTeacher.isPending || updateTeacher.isPending) ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الأستاذ</TableHead>
              <TableHead>اسم المستخدم</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>المحاضرة التجريبية</TableHead>
              <TableHead>الصفوف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : !teachers?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">لا يوجد أساتذة بعد</TableCell></TableRow>
            ) : (
              teachers.map(teacher => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold">
                        {(teacher as any).avatarUrl
                          ? <img src={(teacher as any).avatarUrl} className="w-full h-full object-cover" alt="" />
                          : teacher.fullName?.[0]}
                      </div>
                      <span className="font-medium">{teacher.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm" dir="ltr">{teacher.username}</TableCell>
                  <TableCell dir="ltr" className="text-right text-sm">{teacher.phone}</TableCell>
                  <TableCell>
                    {(teacher as any).trialLessonUrl ? (
                      <Badge variant="outline" className="gap-1 text-xs bg-emerald-50 text-emerald-600 border-emerald-200">
                        <PlayCircle className="w-3 h-3" /> مضافة
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {((teacher as any).gradeLevels ?? []).slice(0, 2).map((gl: string) => (
                        <Badge key={gl} variant="outline" className="text-xs px-1.5 py-0">{gl}</Badge>
                      ))}
                      {((teacher as any).gradeLevels ?? []).length > 2 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 bg-muted">
                          +{((teacher as any).gradeLevels ?? []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {teacher.isActive ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1">
                        <CheckCircle className="w-3 h-3" /> نشط
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1">
                        <XCircle className="w-3 h-3" /> غير نشط
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(teacher)}>
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(teacher.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
