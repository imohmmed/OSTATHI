import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-fetch';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowRight, Users, Video, BookOpen, Phone, User,
  CheckCircle, XCircle, Plus, ShieldCheck, CalendarDays,
} from 'lucide-react';

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [guardianForm, setGuardianForm] = useState({ fullName: '', phone: '', username: '', password: '' });

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

  const { data: guardian } = useQuery({
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
  });

  const addGuardianMutation = useMutation({
    mutationFn: (data: any) =>
      adminFetch('/api/parents', { method: 'POST', body: JSON.stringify({ ...data, studentId }) }),
    onSuccess: () => {
      toast({ title: 'تمت إضافة ولي الأمر بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['student-guardian', studentId] });
      setGuardianOpen(false);
      setGuardianForm({ fullName: '', phone: '', username: '', password: '' });
    },
    onError: (err: any) => {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    },
  });

  const openEdit = () => {
    setForm({
      fullName: student?.fullName ?? '',
      phone: student?.phone ?? '',
      gradeLevel: student?.gradeLevel ?? '',
      username: student?.username ?? '',
      parentName: student?.parentName ?? '',
      parentPhone: student?.parentPhone ?? '',
      notes: student?.notes ?? '',
      isActive: student?.isActive ?? true,
      password: '',
    });
    setEditOpen(true);
  };

  const handleUpdate = () => {
    const payload: any = { ...form };
    if (!payload.password) delete payload.password;
    updateMutation.mutate(payload);
  };

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="h-44 rounded-3xl bg-muted" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-3xl bg-muted" />)}
      </div>
    </div>
  );
  if (!student) return <div className="text-center py-20 text-muted-foreground">لم يُعثر على الطالب</div>;

  const existingGuardian = guardian?.[0];
  const initials = student.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '؟';

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/students">
        <Button variant="ghost" className="gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة للطلاب
        </Button>
      </Link>

      {/* ── Profile Hero ── */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-[#101D36] to-[#2d5299] p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 text-white flex items-center justify-center text-2xl font-bold">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{student.fullName}</h1>
              <p className="text-white/70 text-sm mt-0.5">@{student.username}</p>
              <div className="flex items-center gap-2 mt-2">
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
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
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
            <div className="text-2xl font-bold text-primary">
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

      {/* ── Contact Info ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              معلومات الطالب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الاسم الكامل</span>
              <span className="font-medium">{student.fullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">اسم المستخدم</span>
              <span dir="ltr">{student.username}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">رقم الهاتف</span>
              <span dir="ltr">{student.phone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">المرحلة الدراسية</span>
              <span>{student.gradeLevel}</span>
            </div>
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
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                ولي الأمر
              </CardTitle>
              {!existingGuardian && (
                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setGuardianOpen(true)}>
                  <Plus className="w-3 h-3" /> إضافة
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {existingGuardian ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    {existingGuardian.fullName?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{existingGuardian.fullName}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{existingGuardian.phone}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                  <span>اسم المستخدم</span>
                  <span dir="ltr">{existingGuardian.username}</span>
                </div>
                <p className="text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 rounded p-2">
                  ✓ ولي الأمر مرتبط بهذا الطالب ويتلقى الإشعارات تلقائياً.
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لم يُضف ولي أمر بعد</p>
                <Button className="mt-3 gap-2 h-8 text-xs" onClick={() => setGuardianOpen(true)}>
                  <Plus className="w-3 h-3" /> إضافة ولي أمر
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Activity / Enrollment Timeline ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            الدورات المشترك بها
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!courses?.length ? (
            <div className="text-center py-8 text-muted-foreground">لم يشترك الطالب بأي دورة بعد</div>
          ) : (
            <div className="space-y-3">
              {courses.map((course: any) => (
                <Link key={course.id} href={`/admin/courses/${course.id}`}>
                  <div className="flex items-center gap-4 p-3 rounded-3xl border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {course.thumbnailUrl
                        ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
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

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل بيانات الطالب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">الاسم الكامل</label>
                <Input value={form.fullName ?? ''} onChange={e => setForm((p: any) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">اسم المستخدم</label>
                <Input value={form.username ?? ''} onChange={e => setForm((p: any) => ({ ...p, username: e.target.value }))} dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">رقم الهاتف</label>
                <Input value={form.phone ?? ''} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">المرحلة الدراسية</label>
                <Input value={form.gradeLevel ?? ''} onChange={e => setForm((p: any) => ({ ...p, gradeLevel: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">كلمة المرور (اختياري)</label>
                <Input type="password" value={form.password ?? ''} onChange={e => setForm((p: any) => ({ ...p, password: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">اسم ولي الأمر</label>
                <Input value={form.parentName ?? ''} onChange={e => setForm((p: any) => ({ ...p, parentName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">هاتف ولي الأمر</label>
                <Input value={form.parentPhone ?? ''} onChange={e => setForm((p: any) => ({ ...p, parentPhone: e.target.value }))} dir="ltr" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">ملاحظات</label>
              <Input value={form.notes ?? ''} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Guardian Dialog ── */}
      <Dialog open={guardianOpen} onOpenChange={setGuardianOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة ولي أمر لـ {student.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم ولي الأمر *</label>
              <Input value={guardianForm.fullName} onChange={e => setGuardianForm(p => ({ ...p, fullName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">رقم الهاتف *</label>
              <Input value={guardianForm.phone} onChange={e => setGuardianForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم المستخدم (للتطبيق) *</label>
              <Input value={guardianForm.username} onChange={e => setGuardianForm(p => ({ ...p, username: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">كلمة المرور *</label>
              <Input type="password" value={guardianForm.password} onChange={e => setGuardianForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground bg-muted rounded p-2">
              سيتلقى ولي الأمر إشعارات فورية عند نشاط الطالب، ويمكن التواصل معه عبر قسم أولياء الأمور.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardianOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => addGuardianMutation.mutate(guardianForm)}
              disabled={addGuardianMutation.isPending}
            >
              {addGuardianMutation.isPending ? 'جاري الإضافة...' : 'إضافة ولي الأمر'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
