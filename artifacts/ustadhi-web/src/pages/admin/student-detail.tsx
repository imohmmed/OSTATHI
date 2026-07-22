import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-fetch';
import { useGetTeachers, useGetSubjects } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Video, User, CheckCircle, XCircle, Plus, ShieldCheck,
  CalendarDays, Mail, Phone, BookOpen, GraduationCap,
} from 'lucide-react';

const GRADE_LEVELS = [
  'الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي',
  'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي',
  'الأول المتوسط', 'الثاني المتوسط', 'الثالث المتوسط',
  'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي',
];

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [guardianForm, setGuardianForm] = useState({
    fullName: '', phone: '', email: '', username: '', password: '',
  });

  const { data: teachers } = useGetTeachers();
  const { data: subjects } = useGetSubjects();

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => adminFetch<any>(`/api/students/${studentId}`),
    enabled: !!studentId,
  });

  const { data: courses } = useQuery({
    queryKey: ['student-courses', studentId],
    queryFn: () => adminFetch<any[]>(`/api/students/${studentId}/courses`),
    enabled: !!studentId,
  });

  const { data: guardian, refetch: refetchGuardian } = useQuery({
    queryKey: ['student-guardian', studentId],
    queryFn: () => adminFetch<any[]>(`/api/parents?studentId=${studentId}`),
    enabled: !!studentId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      adminFetch(`/api/students/${studentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'تم التحديث بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      setEditOpen(false);
    },
    onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
  });

  const addGuardianMutation = useMutation({
    mutationFn: (data: any) =>
      adminFetch('/api/parents', { method: 'POST', body: JSON.stringify({ ...data, studentId }) }),
    onSuccess: () => {
      toast({ title: 'تمت إضافة ولي الأمر بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['student-guardian', studentId] });
      setGuardianOpen(false);
      setGuardianForm({ fullName: '', phone: '', email: '', username: '', password: '' });
    },
    onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
  });

  const deleteGuardianMutation = useMutation({
    mutationFn: (parentId: number) =>
      adminFetch(`/api/parents/${parentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'تم حذف ولي الأمر' });
      queryClient.invalidateQueries({ queryKey: ['student-guardian', studentId] });
    },
  });

  const openEdit = () => {
    setForm({
      fullName: student?.fullName ?? '',
      phone: student?.phone ?? '',
      email: student?.email ?? '',
      gradeLevel: student?.gradeLevel ?? '',
      username: student?.username ?? '',
      teacherId: student?.teacherId ? String(student.teacherId) : 'none',
      subjectId: student?.subjectId ? String(student.subjectId) : 'none',
      notes: student?.notes ?? '',
      isActive: student?.isActive ?? true,
      password: '',
    });
    setEditOpen(true);
  };

  const handleUpdate = () => {
    const payload: any = {
      ...form,
      teacherId: form.teacherId === 'none' ? null : form.teacherId ? Number(form.teacherId) : null,
      subjectId: form.subjectId === 'none' ? null : form.subjectId ? Number(form.subjectId) : null,
      email: form.email || null,
    };
    if (!payload.password) delete payload.password;
    updateMutation.mutate(payload);
  };

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="h-44 rounded-3xl bg-muted" />
    </div>
  );
  if (!student) return <div className="text-center py-20 text-muted-foreground">لم يُعثر على الطالب</div>;

  const existingGuardian = guardian?.[0];
  const initials = student.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '؟';

  return (
    <div className="space-y-6">
      <Link href="/admin/students">
        <Button variant="ghost" className="gap-2">
          <ArrowRight className="w-4 h-4" /> العودة للطلاب
        </Button>
      </Link>

      {/* Profile Hero */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-[#101D36] to-[#2d5299] p-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{student.fullName}</h1>
              <p className="text-white/70 text-sm mt-0.5" dir="ltr">@{student.username}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {student.isActive ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-500 gap-1 text-xs">
                    <CheckCircle className="w-3 h-3" /> نشط
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <XCircle className="w-3 h-3" /> غير نشط
                  </Badge>
                )}
                <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-xs">
                  {student.gradeLevel}
                </Badge>
                {student.teacherName && (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-xs gap-1">
                    <GraduationCap className="w-3 h-3" /> {student.teacherName}
                  </Badge>
                )}
                {student.subjectName && (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-xs gap-1">
                    <BookOpen className="w-3 h-3" /> {student.subjectName}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="secondary" size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0 shrink-0"
              onClick={openEdit}
            >
              تعديل
            </Button>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border">
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-primary">{courses?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">دورة مشترك بها</div>
          </div>
          <div className="text-center p-4">
            <div className="text-lg font-bold text-primary">
              {student.createdAt ? new Date(student.createdAt).toLocaleDateString('ar-IQ', { month: 'short', year: 'numeric' }) : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">تاريخ التسجيل</div>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-primary">{existingGuardian ? '✓' : '—'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">ولي الأمر</div>
          </div>
        </div>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" /> معلومات الطالب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="الاسم الكامل" value={student.fullName} />
            <InfoRow label="اسم المستخدم" value={`@${student.username}`} dir="ltr" />
            <InfoRow label="رقم الهاتف" value={student.phone} dir="ltr" icon={<Phone className="w-3 h-3" />} />
            {student.email && <InfoRow label="البريد الإلكتروني" value={student.email} dir="ltr" icon={<Mail className="w-3 h-3" />} />}
            <InfoRow label="المرحلة الدراسية" value={student.gradeLevel} />
            {student.teacherName && <InfoRow label="الأستاذ" value={student.teacherName} />}
            {student.subjectName && <InfoRow label="المادة" value={student.subjectName} />}
            {student.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground text-xs mb-1">ملاحظات</p>
                <p>{student.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guardian */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" /> ولي الأمر
              </CardTitle>
              {!existingGuardian && (
                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setGuardianOpen(true)}>
                  <Plus className="w-3 h-3" /> تعيين حساب ولي أمر
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {existingGuardian ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    {existingGuardian.fullName?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{existingGuardian.fullName}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{existingGuardian.phone}</p>
                    {existingGuardian.email && (
                      <p className="text-xs text-muted-foreground" dir="ltr">{existingGuardian.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                  <span>اسم المستخدم</span>
                  <span dir="ltr">{existingGuardian.username}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                  <p className="text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 rounded p-2 flex-1">
                    ✓ ولي الأمر مرتبط بهذا الطالب
                  </p>
                  <Button
                    size="sm" variant="destructive"
                    className="h-7 text-xs shrink-0"
                    onClick={() => {
                      if (confirm('حذف حساب ولي الأمر؟')) {
                        deleteGuardianMutation.mutate(existingGuardian.id);
                      }
                    }}
                  >
                    حذف
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm mb-3">لم يُضف ولي أمر بعد</p>
                <Button className="gap-2 h-9 text-sm" onClick={() => setGuardianOpen(true)}>
                  <Plus className="w-4 h-4" /> تعيين حساب ولي أمر
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Courses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" /> الدورات المشترك بها
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!courses?.length ? (
            <div className="text-center py-8 text-muted-foreground">لم يشترك الطالب بأي دورة بعد</div>
          ) : (
            <div className="space-y-3">
              {courses.map((course: any) => (
                <Link key={course.id} href={`/admin/courses/${course.id}`}>
                  <div className="flex items-center gap-4 p-3 rounded-2xl border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {course.thumbnailUrl
                        ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" alt={course.title} />
                        : <Video className="w-5 h-5 text-muted-foreground/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{course.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {course.subjectName} • {course.teacherName}
                      </p>
                    </div>
                    <Badge variant={course.isPublished ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {course.isPublished ? 'منشورة' : 'مسودة'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل بيانات الطالب</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">البيانات الشخصية</p>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="الاسم الكامل" value={form.fullName ?? ''} onChange={v => setForm((p: any) => ({ ...p, fullName: v }))} />
                <FieldRow label="رقم الهاتف" value={form.phone ?? ''} onChange={v => setForm((p: any) => ({ ...p, phone: v }))} dir="ltr" />
                <FieldRow label="البريد الإلكتروني" value={form.email ?? ''} onChange={v => setForm((p: any) => ({ ...p, email: v }))} dir="ltr" type="email" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">التعيين الدراسي</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">المرحلة / الصف</label>
                  <Select value={form.gradeLevel} onValueChange={v => setForm((p: any) => ({ ...p, gradeLevel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">الأستاذ</label>
                  <Select value={form.teacherId ?? 'none'} onValueChange={v => setForm((p: any) => ({ ...p, teacherId: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون تعيين —</SelectItem>
                      {teachers?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">المادة الدراسية</label>
                  <Select value={form.subjectId ?? 'none'} onValueChange={v => setForm((p: any) => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون تعيين —</SelectItem>
                      {subjects?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">حساب الدخول</p>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="اسم المستخدم" value={form.username ?? ''} onChange={v => setForm((p: any) => ({ ...p, username: v }))} dir="ltr" />
                <FieldRow label="كلمة المرور (اختياري)" value={form.password ?? ''} onChange={v => setForm((p: any) => ({ ...p, password: v }))} type="password" />
              </div>
            </div>

            <FieldRow label="ملاحظات" value={form.notes ?? ''} onChange={v => setForm((p: any) => ({ ...p, notes: v }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Guardian Dialog */}
      <Dialog open={guardianOpen} onOpenChange={setGuardianOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعيين حساب ولي أمر — {student.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
              سيُنشأ حساب خاص لولي الأمر مرتبط بهذا الطالب فقط. عند تسجيل دخوله ستُفتح صفحة متابعة الطالب.
            </p>
            <FieldRow label="اسم ولي الأمر *" value={guardianForm.fullName} onChange={v => setGuardianForm(p => ({ ...p, fullName: v }))} />
            <FieldRow label="رقم الهاتف *" value={guardianForm.phone} onChange={v => setGuardianForm(p => ({ ...p, phone: v }))} dir="ltr" />
            <FieldRow label="البريد الإلكتروني" value={guardianForm.email} onChange={v => setGuardianForm(p => ({ ...p, email: v }))} dir="ltr" type="email" />
            <FieldRow label="اسم المستخدم * (للتطبيق)" value={guardianForm.username} onChange={v => setGuardianForm(p => ({ ...p, username: v }))} dir="ltr" />
            <FieldRow label="كلمة المرور *" value={guardianForm.password} onChange={v => setGuardianForm(p => ({ ...p, password: v }))} type="password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardianOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => addGuardianMutation.mutate(guardianForm)}
              disabled={addGuardianMutation.isPending}
            >
              {addGuardianMutation.isPending ? 'جاري الإضافة...' : 'إنشاء الحساب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── small helpers ── */
function InfoRow({ label, value, dir, icon }: { label: string; value: string; dir?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground flex items-center gap-1">{icon}{label}</span>
      <span className="font-medium" dir={dir}>{value}</span>
    </div>
  );
}

function FieldRow({ label, value, onChange, dir, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; dir?: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} dir={dir} type={type} />
    </div>
  );
}
