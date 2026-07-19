import React, { useMemo } from 'react';
import { useGetDashboardStats, useGetSubjects, useGetTeachers, useGetCourses } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import {
  Users, GraduationCap, Video, BookOpen, ArrowLeft,
  TrendingUp, Radio, Star,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: subjects, isLoading: subjectsLoading } = useGetSubjects();
  const { data: teachers, isLoading: teachersLoading } = useGetTeachers();
  const { data: courses, isLoading: coursesLoading } = useGetCourses();

  // Compute teacher count per subject client-side
  const subjectTeacherCounts = useMemo(() => {
    const map: Record<number, number> = {};
    teachers?.forEach((t) => {
      ((t as any).subjectIds ?? []).forEach((sid: number) => {
        map[sid] = (map[sid] || 0) + 1;
      });
    });
    return map;
  }, [teachers]);

  // Compute subject names per teacher
  const subjectMap = useMemo(() => {
    const map: Record<number, string> = {};
    subjects?.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [subjects]);

  const statCards = [
    { title: 'إجمالي الطلاب', value: stats?.totalStudents ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/15', link: '/admin/students' },
    { title: 'الأساتذة', value: stats?.totalTeachers ?? 0, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/15', link: '/admin/teachers' },
    { title: 'المواد الدراسية', value: stats?.totalSubjects ?? 0, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/15', link: '/admin/subjects' },
    { title: 'إجمالي الدورات', value: stats?.totalCourses ?? 0, icon: Video, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-500/15', link: '/admin/courses' },
    { title: 'بثوث مباشرة نشطة', value: stats?.activeStreams ?? 0, icon: Radio, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/15', link: '/admin/livestreams' },
    { title: 'أولياء الأمور', value: stats?.totalParents ?? 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/15', link: '/admin/parents' },
    { title: 'المساعدون', value: stats?.totalAssistants ?? 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/15', link: '/admin/assistants' },
    { title: 'التقييمات', value: stats?.recentReviews ?? 0, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-500/15', link: '/admin/reviews' },
  ];

  const subjectColors = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-emerald-500 to-emerald-700',
    'from-rose-500 to-rose-700',
    'from-amber-500 to-amber-700',
    'from-indigo-500 to-indigo-700',
    'from-teal-500 to-teal-700',
    'from-pink-500 to-pink-700',
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">نظرة شاملة على المنصة</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Link key={i} href={stat.link}>
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-muted-foreground/40" />
                </div>
                <div className="text-2xl font-bold">{statsLoading ? '—' : stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.title}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── المواد الدراسية ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">المواد الدراسية</h2>
          <Link href="/admin/subjects">
            <span className="text-sm text-primary flex items-center gap-1 hover:underline cursor-pointer">
              عرض الكل <ArrowLeft className="w-4 h-4" />
            </span>
          </Link>
        </div>

        {subjectsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-3xl bg-muted animate-pulse" />)}
          </div>
        ) : subjects?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">لا توجد مواد دراسية بعد</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects?.map((subject, idx) => (
              <Link key={subject.id} href={`/admin/subjects/${subject.id}`}>
                <div className="group cursor-pointer rounded-3xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className={`bg-gradient-to-br ${subjectColors[idx % subjectColors.length]} p-5 text-white`}>
                    <BookOpen className="w-8 h-8 mb-3 opacity-80" />
                    <h3 className="font-bold text-lg leading-tight">{subject.name}</h3>
                    <p className="text-white/70 text-xs mt-1">{subject.gradeLevel}</p>
                  </div>
                  <div className="bg-card px-4 py-3 flex items-center justify-between text-sm border border-t-0 rounded-b-2xl">
                    <span className="text-muted-foreground">
                      {subjectTeacherCounts[subject.id] ?? 0} أستاذ
                    </span>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── الأساتذة (Banner style) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">الأساتذة</h2>
          <Link href="/admin/teachers">
            <span className="text-sm text-primary flex items-center gap-1 hover:underline cursor-pointer">
              عرض الكل <ArrowLeft className="w-4 h-4" />
            </span>
          </Link>
        </div>

        {teachersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="h-56 rounded-3xl bg-muted animate-pulse" />)}
          </div>
        ) : teachers?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">لا يوجد أساتذة بعد</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {teachers?.slice(0, 8).map((teacher) => {
              const teacherSubjectNames = ((teacher as any).subjectIds ?? [])
                .map((sid: number) => subjectMap[sid])
                .filter(Boolean);
              return (
                <Link key={teacher.id} href={`/admin/teachers/${teacher.id}`}>
                  <div className="group bg-card border border-border rounded-3xl overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                    {/* Wide banner image */}
                    <div className="relative aspect-[16/7] bg-gradient-to-br from-[#101D36] to-[#2d5299] overflow-hidden">
                      {teacher.avatarUrl ? (
                        <img
                          src={teacher.avatarUrl}
                          alt={teacher.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <GraduationCap className="w-14 h-14 text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {!teacher.isActive && (
                        <Badge variant="destructive" className="absolute top-2 right-2 text-xs">غير نشط</Badge>
                      )}
                    </div>
                    {/* Info below image */}
                    <div className="p-4">
                      <h3 className="font-bold text-base">{teacher.fullName}</h3>
                      {teacherSubjectNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {teacherSubjectNames.slice(0, 3).map((name: string) => (
                            <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                          ))}
                          {teacherSubjectNames.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{teacherSubjectNames.length - 3}</Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">لا توجد مواد محددة</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── الدورات ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">آخر الدورات</h2>
          <Link href="/admin/courses">
            <span className="text-sm text-primary flex items-center gap-1 hover:underline cursor-pointer">
              عرض الكل <ArrowLeft className="w-4 h-4" />
            </span>
          </Link>
        </div>

        {coursesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-48 rounded-3xl bg-muted animate-pulse" />)}
          </div>
        ) : courses?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">لا توجد دورات بعد</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courses?.slice(0, 8).map((course) => (
              <Link key={course.id} href={`/admin/courses/${course.id}`}>
                <div className="bg-card border border-border rounded-3xl overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <Video className="w-10 h-10 text-muted-foreground/30" />
                    )}
                    <Badge
                      variant={course.isPublished ? 'default' : 'secondary'}
                      className="absolute top-2 right-2 text-xs"
                    >
                      {course.isPublished ? 'منشورة' : 'مسودة'}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm line-clamp-1">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {course.subjectName} • {course.teacherName}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{course.lessonsCount ?? 0} درس</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.studentsCount ?? 0} طالب</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
