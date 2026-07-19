import React from 'react';
import { useGetDashboardStats } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  GraduationCap, 
  Video, 
  BookOpen, 
  UserCheck, 
  Star, 
  Radio, 
  Bell
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from 'react-day-picker';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-16 bg-muted/50 rounded-t-xl" />
              <CardContent className="h-20 bg-muted/20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'إجمالي الطلاب', value: stats?.totalStudents || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', link: '/admin/students' },
    { title: 'الأساتذة', value: stats?.totalTeachers || 0, icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', link: '/admin/teachers' },
    { title: 'الدورات', value: stats?.totalCourses || 0, icon: Video, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', link: '/admin/courses' },
    { title: 'المواد', value: stats?.totalSubjects || 0, icon: BookOpen, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10', link: '/admin/subjects' },
    { title: 'المساعدون', value: stats?.totalAssistants || 0, icon: UserCheck, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', link: '/admin/assistants' },
    { title: 'أولياء الأمور', value: stats?.totalParents || 0, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', link: '/admin/parents' },
    { title: 'بثوث مباشرة نشطة', value: stats?.activeStreams || 0, icon: Radio, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', link: '/admin/livestreams' },
    { title: 'آخر التقييمات', value: stats?.recentReviews || 0, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', link: '/admin/reviews' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">مرحباً بك في لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2">إليك نظرة عامة على إحصائيات المنصة اليوم.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Link key={i} href={stat.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:-translate-y-1 duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>النشاط الأخير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">تم تسجيل طالب جديد</p>
                  <p className="text-sm text-muted-foreground">منذ ساعتين</p>
                </div>
              </div>
              <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">تمت إضافة دورة جديدة: الرياضيات للصف السادس</p>
                  <p className="text-sm text-muted-foreground">منذ 5 ساعات</p>
                </div>
              </div>
              <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">تقييم جديد 5 نجوم من الطالب أحمد</p>
                  <p className="text-sm text-muted-foreground">منذ يوم</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/admin/students">
                <Button variant="secondary" className="w-full h-14 justify-start gap-3 bg-white/10 hover:bg-white/20 border-0 text-white">
                  <Users className="w-5 h-5" />
                  إضافة طالب
                </Button>
              </Link>
              <Link href="/admin/courses">
                <Button variant="secondary" className="w-full h-14 justify-start gap-3 bg-white/10 hover:bg-white/20 border-0 text-white">
                  <Video className="w-5 h-5" />
                  إنشاء دورة
                </Button>
              </Link>
              <Link href="/admin/livestreams">
                <Button variant="secondary" className="w-full h-14 justify-start gap-3 bg-white/10 hover:bg-white/20 border-0 text-white">
                  <Radio className="w-5 h-5" />
                  جدولة بث
                </Button>
              </Link>
              <Link href="/admin/notifications">
                <Button variant="secondary" className="w-full h-14 justify-start gap-3 bg-white/10 hover:bg-white/20 border-0 text-white">
                  <Bell className="w-5 h-5" />
                  إرسال إشعار
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
