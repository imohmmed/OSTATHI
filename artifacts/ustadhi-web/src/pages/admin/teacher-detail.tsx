import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGetCourses, useGetSubjects } from '@workspace/api-client-react';
import { adminFetch } from '@/lib/admin-fetch';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowRight, GraduationCap, Users, Video, BookOpen,
  Edit, CheckCircle, XCircle, Phone, User,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const GRADE_LEVELS = [
  'الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي',
  'الصف الأول المتوسط','الصف الثاني المتوسط','الصف الثالث المتوسط',
  'الصف الأول الإعدادي','الصف الثاني الإعدادي','الصف الثالث الإعدادي',
  'الصف الرابع الإعدادي','الصف الخامس الإعدادي','الصف السادس الإعدادي',
];

export default function TeacherDetailPage() {
  const params = useParams<{ id: string }>();
  const teacherId = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: () => adminFetch<any>(`/api/teachers/${teacherId}`),
    enabled: !!teacherId,
  });

  const { data: courses } = useGetCourses({ teacherId });
  const { data: subjects } = useGetSubjects();

  const { data: students } = useQuery({
    queryKey: ['teacher-students', teacherId],
    queryFn: () => adminFetch<any[]>(`/api/teachers/${teacherId}/students`),
    enabled: !!teacherId,
  });

  // Edit form state
  const [form, setForm] = useState<any>({});
  const openEdit = () => {
    setForm({
      fullName: teacher?.fullName ?? '',
      phone: teacher?.phone ?? '',
      username: teacher?.username ?? '',
      bio: teacher?.bio ?? '',
      avatarUrl: teacher?.avatarUrl ?? '',
      isActive: teacher?.isActive ?? true,
      subjectIds: teacher?.subjectIds ?? [],
      gradeLevels: teacher?.gradeLevels ?? [],
      password: '',
    });
    setEditOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      adminFetch(`/api/teachers/${teacherId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: 'تم التحديث بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['teacher', teacherId] });
      setEditOpen(false);
    },
  });

  const handleSubmit = () => {
    const payload: any = { ...form };
    if (!payload.password) delete payload.password;
    updateMutation.mutate(payload);
  };

  const toggleSubject = (id: number) => {
    setForm((prev: any) => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(id)
        ? prev.subjectIds.filter((s: number) => s !== id)
        : [...prev.subjectIds, id],
    }));
  };

  const toggleGrade = (g: string) => {
    setForm((prev: any) => ({
      ...prev,
      gradeLevels: prev.gradeLevels.includes(g)
        ? prev.gradeLevels.filter((x: string) => x !== g)
        : [...prev.gradeLevels, g],
    }));
  };

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-52 rounded-2xl bg-muted" />
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-64 rounded bg-muted" />
    </div>
  );

  if (!teacher) return (
    <div className="text-center py-20 text-muted-foreground">لم يُعثر على الأستاذ</div>
  );

  const teacherSubjectNames = (teacher.subjectIds ?? [])
    .map((sid: number) => subjects?.find(s => s.id === sid)?.name)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/teachers">
        <Button variant="ghost" className="gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة للأساتذة
        </Button>
      </Link>

      {/* ── Hero Banner (صورة عرضية) ── */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <div className="relative w-full aspect-[16/6] bg-gradient-to-br from-[#101D36] to-[#2d5299] overflow-hidden">
          {teacher.avatarUrl ? (
            <img src={teacher.avatarUrl} alt={teacher.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <GraduationCap className="w-24 h-24 text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {/* Edit button overlaid */}
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-4 left-4 gap-2 bg-white/90 hover:bg-white text-foreground"
            onClick={openEdit}
          >
            <Edit className="w-4 h-4" />
            تعديل
          </Button>
          {/* Status badge */}
          <div className="absolute top-4 right-4">
            {teacher.isActive ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-500 gap-1">
                <CheckCircle className="w-3 h-3" /> نشط
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" /> غير نشط
              </Badge>
            )}
          </div>
          {/* Teacher name over the image */}
          <div className="absolute bottom-4 right-4">
            <h1 className="text-3xl font-bold text-white drop-shadow">{teacher.fullName}</h1>
            <p className="text-white/70 text-sm mt-0.5">@{teacher.username}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="bg-card px-6 py-4 grid grid-cols-3 divide-x divide-x-reverse divide-border">
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-primary">{teacher.studentsCount ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">طالب</div>
          </div>
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-primary">{courses?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">دورة</div>
          </div>
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-primary">{teacherSubjectNames.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">مادة</div>
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">معلومات الاتصال</h3>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span dir="ltr">{teacher.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{teacher.username}</span>
            </div>
          </CardContent>
        </Card>
        {/* Subjects */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">المواد الدراسية</h3>
            {teacherSubjectNames.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد مواد</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {teacherSubjectNames.map((name: string) => (
                  <Badge key={name} variant="secondary">{name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Grade levels */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">الصفوف الدراسية</h3>
            {(teacher.gradeLevels ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد صفوف</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(teacher.gradeLevels ?? []).slice(0, 6).map((g: string) => (
                  <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                ))}
                {(teacher.gradeLevels ?? []).length > 6 && (
                  <Badge variant="outline" className="text-xs">+{(teacher.gradeLevels ?? []).length - 6}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bio */}
      {teacher.bio && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">نبذة تعريفية</h3>
            <p className="text-sm leading-relaxed">{teacher.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs: courses + students */}
      <Tabs defaultValue="courses">
        <TabsList className="w-full">
          <TabsTrigger value="courses" className="flex-1 gap-2">
            <Video className="w-4 h-4" /> الدورات ({courses?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="students" className="flex-1 gap-2">
            <Users className="w-4 h-4" /> الطلاب ({students?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          {!courses?.length ? (
            <div className="text-center py-10 text-muted-foreground">لا توجد دورات</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Link key={course.id} href={`/admin/courses/${course.id}`}>
                  <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md cursor-pointer transition-all">
                    <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                      {course.thumbnailUrl
                        ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                        : <Video className="w-8 h-8 text-muted-foreground/30" />}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm line-clamp-1">{course.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span><BookOpen className="inline w-3 h-3 ml-1" />{course.lessonsCount ?? 0} درس</span>
                        <span><Users className="inline w-3 h-3 ml-1" />{course.studentsCount ?? 0} طالب</span>
                        <Badge variant={course.isPublished ? 'default' : 'secondary'} className="text-xs py-0">
                          {course.isPublished ? 'منشورة' : 'مسودة'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          {!students?.length ? (
            <div className="text-center py-10 text-muted-foreground">لا يوجد طلاب</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {students.map((student: any) => (
                <Link key={student.id} href={`/admin/students/${student.id}`}>
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm cursor-pointer transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {student.fullName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{student.fullName}</p>
                      <p className="text-xs text-muted-foreground">{student.gradeLevel}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الأستاذ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">الاسم الكامل</label>
                <Input value={form.fullName ?? ''} onChange={e => setForm((p: any) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">اسم المستخدم</label>
                <Input value={form.username ?? ''} onChange={e => setForm((p: any) => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">رقم الهاتف</label>
                <Input value={form.phone ?? ''} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">كلمة المرور الجديدة (اختياري)</label>
                <Input type="password" value={form.password ?? ''} onChange={e => setForm((p: any) => ({ ...p, password: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">رابط صورة الغلاف (للبانر العريض)</label>
              <Input value={form.avatarUrl ?? ''} onChange={e => setForm((p: any) => ({ ...p, avatarUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">نبذة تعريفية</label>
              <Textarea value={form.bio ?? ''} onChange={e => setForm((p: any) => ({ ...p, bio: e.target.value }))} rows={3} />
            </div>
            {/* Subjects */}
            <div className="space-y-2">
              <label className="text-sm font-medium">المواد الدراسية</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-md p-3 max-h-32 overflow-y-auto">
                {subjects?.map(s => (
                  <div key={s.id} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSubject(s.id)}>
                    <Checkbox checked={(form.subjectIds ?? []).includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
                    <span className="text-sm">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Grade levels */}
            <div className="space-y-2">
              <label className="text-sm font-medium">الصفوف الدراسية</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                {GRADE_LEVELS.map(g => (
                  <div key={g} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleGrade(g)}>
                    <Checkbox checked={(form.gradeLevels ?? []).includes(g)} onCheckedChange={() => toggleGrade(g)} />
                    <span className="text-xs">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Active toggle */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm((p: any) => ({ ...p, isActive: !p.isActive }))}>
              <Checkbox checked={form.isActive} onCheckedChange={v => setForm((p: any) => ({ ...p, isActive: !!v }))} />
              <span className="text-sm">الأستاذ نشط</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
