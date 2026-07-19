import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-fetch';
import { useGetCourses } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowRight, BookOpen, GraduationCap, Users, Video, Plus, CheckCircle
} from 'lucide-react';

export default function SubjectDetailPage() {
  const params = useParams<{ id: string }>();
  const subjectId = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);

  const { data: subject, isLoading } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => adminFetch<any>(`/api/subjects/${subjectId}`),
    enabled: !!subjectId,
  });

  const { data: courses } = useGetCourses({ subjectId });

  const [newTeacher, setNewTeacher] = useState({
    fullName: '', phone: '', username: '', password: '', bio: '',
  });

  const addTeacherMutation = useMutation({
    mutationFn: (data: any) =>
      adminFetch('/api/teachers', {
        method: 'POST',
        body: JSON.stringify({ ...data, subjectIds: [subjectId] }),
      }),
    onSuccess: () => {
      toast({ title: 'تمت إضافة الأستاذ بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['subject', subjectId] });
      setAddTeacherOpen(false);
      setNewTeacher({ fullName: '', phone: '', username: '', password: '', bio: '' });
    },
    onError: (err: any) => {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    },
  });

  const handleAddTeacher = () => {
    if (!newTeacher.fullName || !newTeacher.phone || !newTeacher.username || !newTeacher.password) {
      toast({ title: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    addTeacherMutation.mutate(newTeacher);
  };

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="h-28 rounded-3xl bg-muted" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-3xl bg-muted" />)}
      </div>
    </div>
  );

  if (!subject) return <div className="text-center py-20 text-muted-foreground">لم يُعثر على المادة</div>;

  const gradientMap: Record<string, string> = {
    'رياضيات': 'from-blue-500 to-blue-700',
    'علوم': 'from-emerald-500 to-emerald-700',
    'عربي': 'from-amber-500 to-amber-700',
    'فيزياء': 'from-indigo-500 to-indigo-700',
    'كيمياء': 'from-purple-500 to-purple-700',
    'احياء': 'from-teal-500 to-teal-700',
    'انجليزي': 'from-rose-500 to-rose-700',
  };
  const gradient = Object.entries(gradientMap).find(([k]) => subject.name.includes(k))?.[1] ?? 'from-[#101D36] to-[#2d5299]';

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/subjects">
        <Button variant="ghost" className="gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة للمواد
        </Button>
      </Link>

      {/* ── Subject Header ── */}
      <div className={`rounded-3xl bg-gradient-to-br ${gradient} text-white p-6 flex items-start justify-between`}>
        <div>
          <BookOpen className="w-10 h-10 mb-3 opacity-70" />
          <h1 className="text-3xl font-bold">{subject.name}</h1>
          <p className="text-white/70 mt-1">{subject.gradeLevel}</p>
          {subject.description && <p className="text-white/60 text-sm mt-2 max-w-lg">{subject.description}</p>}
        </div>
        <Button
          className="bg-white/20 hover:bg-white/30 text-white border-0 gap-2"
          onClick={() => setAddTeacherOpen(true)}
        >
          <Plus className="w-4 h-4" />
          إضافة أستاذ
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <div className="text-3xl font-bold text-primary">{subject.teachersCount ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <GraduationCap className="w-4 h-4" /> أستاذ
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <div className="text-3xl font-bold text-primary">{subject.coursesCount ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Video className="w-4 h-4" /> دورة
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <div className="text-3xl font-bold text-primary">{subject.studentsCount ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Users className="w-4 h-4" /> طالب
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Teachers Grid ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">الأساتذة الذين يدرّسون هذه المادة</h2>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setAddTeacherOpen(true)}>
            <Plus className="w-4 h-4" /> إضافة أستاذ
          </Button>
        </div>
        {subject.teachers?.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-3xl text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لا يوجد أساتذة لهذه المادة بعد</p>
            <Button className="mt-4 gap-2" onClick={() => setAddTeacherOpen(true)}>
              <Plus className="w-4 h-4" /> إضافة أستاذ الآن
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subject.teachers?.map((teacher: any) => (
              <Link key={teacher.id} href={`/admin/teachers/${teacher.id}`}>
                <div className="bg-card border border-border rounded-3xl overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                  {/* Wide banner */}
                  <div className="relative aspect-[16/7] bg-gradient-to-br from-[#101D36] to-[#2d5299] overflow-hidden">
                    {teacher.avatarUrl ? (
                      <img src={teacher.avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <GraduationCap className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {teacher.isActive && (
                      <CheckCircle className="absolute top-2 left-2 w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-bold">{teacher.fullName}</p>
                    {teacher.gradeLevels?.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {teacher.gradeLevels.slice(0, 2).map((g: string) => (
                          <Badge key={g} variant="outline" className="text-xs py-0">{g}</Badge>
                        ))}
                        {teacher.gradeLevels.length > 2 && (
                          <Badge variant="outline" className="text-xs py-0">+{teacher.gradeLevels.length - 2}</Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">لا توجد صفوف محددة</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Courses ── */}
      {courses && courses.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">دورات هذه المادة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Link key={course.id} href={`/admin/courses/${course.id}`}>
                <div className="bg-card border border-border rounded-3xl overflow-hidden cursor-pointer hover:shadow-md transition-all">
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {course.thumbnailUrl
                      ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                      : <Video className="w-8 h-8 text-muted-foreground/30" />}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm line-clamp-1">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{course.teacherName}</p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{course.lessonsCount ?? 0} درس</span>
                      <span>{course.studentsCount ?? 0} طالب</span>
                      <Badge variant={course.isPublished ? 'default' : 'secondary'} className="text-xs py-0">
                        {course.isPublished ? 'منشورة' : 'مسودة'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Add Teacher Dialog ── */}
      <Dialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة أستاذ لمادة {subject.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم الأستاذ *</label>
              <Input
                value={newTeacher.fullName}
                onChange={e => setNewTeacher(p => ({ ...p, fullName: e.target.value }))}
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">البريد الإلكتروني / اسم المستخدم *</label>
              <Input
                value={newTeacher.username}
                onChange={e => setNewTeacher(p => ({ ...p, username: e.target.value }))}
                placeholder="يُستخدم لتسجيل الدخول"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">الرمز (كلمة المرور) *</label>
              <Input
                type="password"
                value={newTeacher.password}
                onChange={e => setNewTeacher(p => ({ ...p, password: e.target.value }))}
                placeholder="رمز الدخول"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">رقم الهاتف *</label>
              <Input
                value={newTeacher.phone}
                onChange={e => setNewTeacher(p => ({ ...p, phone: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">نبذة تعريفية (اختياري)</label>
              <Textarea
                value={newTeacher.bio}
                onChange={e => setNewTeacher(p => ({ ...p, bio: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted rounded-2xl p-3">
              سيتمكن الأستاذ من تسجيل الدخول عبر التطبيق باستخدام <strong>اسم المستخدم</strong> و<strong>الرمز</strong> المحددَين أعلاه، وستُضاف له مادة <strong>{subject.name}</strong> تلقائياً.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTeacherOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddTeacher} disabled={addTeacherMutation.isPending}>
              {addTeacherMutation.isPending ? 'جاري الإضافة...' : 'إضافة الأستاذ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
