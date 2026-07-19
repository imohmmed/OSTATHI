import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { 
  useGetSubjects, 
  useGetTeachers, 
  useGetCourses, 
  useGetReviews 
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  GraduationCap, 
  BookOpen, 
  Video, 
  Star, 
  ChevronLeft, 
  MonitorPlay,
  CheckCircle2,
  Users,
  Award,
  Badge
} from 'lucide-react';
import { SiInstagram, SiWhatsapp, SiTiktok, SiYoutube } from 'react-icons/si';

export default function LandingPage() {
  const { data: subjects } = useGetSubjects();
  const { data: teachers } = useGetTeachers();
  const { data: courses } = useGetCourses({ isPublished: true });
  const { data: reviews } = useGetReviews({ isPublished: true });

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 text-foreground">
      
      {/* Navbar */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-background/90 backdrop-blur-md shadow-sm border-b' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-black text-primary dark:text-white tracking-tight">استاذي</span>
            </div>
            
            <nav className="hidden md:flex gap-8 items-center">
              <a href="#home" className="text-sm font-semibold hover:text-primary transition-colors">الرئيسية</a>
              <a href="#subjects" className="text-sm font-semibold hover:text-primary transition-colors">المواد</a>
              <a href="#teachers" className="text-sm font-semibold hover:text-primary transition-colors">الأساتذة</a>
              <a href="#courses" className="text-sm font-semibold hover:text-primary transition-colors">الدورات</a>
              <a href="#reviews" className="text-sm font-semibold hover:text-primary transition-colors">آراء الطلاب</a>
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/admin/login">
                <Button variant="outline" className="border-primary/20 hover:bg-primary/5 text-primary font-bold px-6">
                  دخول الإدارة
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-primary -z-10">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          {/* Decorative blur blobs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/30 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white relative z-10">
          <Badge className="bg-white/10 hover:bg-white/20 text-white border-white/20 mb-6 py-1.5 px-4 backdrop-blur-sm">
            🌟 المنصة التعليمية الأولى في العراق
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
            طريقك نحو <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-300 to-indigo-300">التفوق</span> يبدأ من هنا
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-10 leading-relaxed">
            نخبة من أفضل أساتذة العراق يقدمون لك تجربة تعليمية متكاملة، تفاعلية، ومصممة لضمان نجاحك بأعلى المعدلات.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="h-14 px-8 text-lg font-bold bg-white text-primary hover:bg-gray-100 shadow-xl shadow-white/10 rounded-full">
              حمّل التطبيق الآن
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-white/30 text-white hover:bg-white/10 hover:text-white rounded-full backdrop-blur-sm">
              تصفح الدورات المجانية
            </Button>
          </div>

          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-10 text-center">
            <div><div className="text-4xl font-black text-white mb-2">+10k</div><div className="text-blue-200 text-sm font-medium">طالب مسجل</div></div>
            <div><div className="text-4xl font-black text-white mb-2">+50</div><div className="text-blue-200 text-sm font-medium">أستاذ خبير</div></div>
            <div><div className="text-4xl font-black text-white mb-2">+200</div><div className="text-blue-200 text-sm font-medium">دورة تفاعلية</div></div>
            <div><div className="text-4xl font-black text-white mb-2">99%</div><div className="text-blue-200 text-sm font-medium">نسبة النجاح</div></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">لماذا تختار استاذي؟</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">صممنا المنصة لتلبي كافة احتياجات الطالب العراقي بأسلوب عصري وتقنيات حديثة.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><MonitorPlay className="w-8 h-8" /></div>
                <h3 className="text-xl font-bold mb-3">دروس تفاعلية وبث مباشر</h3>
                <p className="text-muted-foreground">تفاعل مع أستاذك في الوقت الفعلي أو شاهد الدروس المسجلة بدقة عالية في أي وقت.</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm transform md:-translate-y-4">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-8 h-8" /></div>
                <h3 className="text-xl font-bold mb-3">امتحانات مستمرة</h3>
                <p className="text-muted-foreground">اختبر مستواك باستمرار من خلال بنك أسئلة شامل وامتحانات الكترونية مطابقة للوزاري.</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Users className="w-8 h-8" /></div>
                <h3 className="text-xl font-bold mb-3">متابعة فردية</h3>
                <p className="text-muted-foreground">فريق من المساعدين التربويين لمتابعة تطور كل طالب والإجابة على استفساراته يومياً.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section id="subjects" className="py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">المواد الدراسية</h2>
              <p className="text-muted-foreground text-lg">تغطية شاملة للمناهج الدراسية</p>
            </div>
            <Button variant="ghost" className="hidden sm:flex gap-2">عرض الكل <ChevronLeft className="w-4 h-4" /></Button>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {(subjects && subjects.length > 0 ? subjects : Array.from({length: 5}).map((_,i) => ({id: i, name: 'مادة دراسية', gradeLevel: 'المرحلة'}))).map((subject) => (
              <Card key={subject.id} className="shrink-0 w-64 snap-start cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all group">
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 bg-primary/5 group-hover:bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                    <BookOpen className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold">{subject.name}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{subject.gradeLevel}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Teachers Section */}
      <section id="teachers" className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-4">نخبة الكادر التدريسي</Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-4">أفضل الأساتذة في العراق</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {(teachers && teachers.length > 0 ? teachers.slice(0,4) : Array.from({length: 4})).map((teacher: any, idx) => (
              <Card key={teacher?.id || idx} className="bg-white/10 border-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all border-none">
                <CardContent className="p-0">
                  <div className="aspect-square bg-white/5 relative overflow-hidden">
                    {teacher?.avatarUrl ? (
                      <img src={teacher.avatarUrl} alt={teacher.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-foreground/5">
                        <GraduationCap className="w-16 h-16 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold">{teacher?.fullName || 'اسم الأستاذ'}</h3>
                    <p className="text-blue-200 text-sm mt-1">{teacher?.bio || 'خبير في تدريس المادة ووضع الأسئلة الوزارية'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">الدورات المميزة</h2>
            <p className="text-muted-foreground text-lg">اختر الدورة التي تناسبك وابدأ التعلم فوراً</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(courses && courses.length > 0 ? courses.slice(0,3) : Array.from({length: 3})).map((course: any, idx) => (
              <Card key={course?.id || idx} className="overflow-hidden border-border hover:shadow-2xl hover:shadow-primary/5 transition-all group">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {course?.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <Video className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary">
                    {course?.subjectName || 'المادة'}
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2 line-clamp-2">{course?.title || 'عنوان الدورة الشاملة للتحضير للامتحانات'}</h3>
                  <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
                    <Award className="w-4 h-4" /> الأستاذ: <span className="font-bold text-foreground">{course?.teacherName || 'اسم الأستاذ'}</span>
                  </p>
                  <Button className="w-full font-bold h-12 rounded-xl">تفاصيل الدورة</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" className="px-8 border-primary/20 hover:bg-primary/5">تصفح جميع الدورات</Button>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">آراء طلابنا</h2>
            <p className="text-muted-foreground text-lg">نفخر بقصص نجاح طلابنا في كل محافظات العراق</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(reviews && reviews.length > 0 ? reviews.slice(0,3) : Array.from({length: 3})).map((review: any, idx) => (
              <Card key={review?.id || idx} className="bg-card border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex gap-1 text-yellow-400 mb-6">
                    {Array.from({length: review?.rating || 5}).map((_,i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-foreground font-medium text-lg leading-relaxed mb-6">
                    "{review?.comment || 'منصة رائعة جداً والأساتذة ممتازين والشرح واضح ومفهوم. بفضل الله ثم بفضلكم حصلت على معدل عالي.'}"
                  </p>
                  <div className="flex items-center gap-4 border-t border-border pt-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                      {(review?.studentName || 'طالب').charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold">{review?.studentName || 'اسم الطالب'}</div>
                      <div className="text-sm text-muted-foreground">طالب مسجل</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA App */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <h2 className="text-3xl md:text-5xl font-black mb-6 relative z-10">تعلم في أي وقت ومن أي مكان</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10 relative z-10">
              حمّل تطبيق استاذي الآن على هاتفك الذكي واستمتع بتجربة تعليمية فريدة، تحميل الفيديوهات لمشاهدتها بدون إنترنت، واستقبال إشعارات البث المباشر.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Button size="lg" className="h-14 px-8 text-lg font-bold bg-black hover:bg-gray-900 text-white rounded-xl">
                App Store
              </Button>
              <Button size="lg" className="h-14 px-8 text-lg font-bold bg-white hover:bg-gray-100 text-black rounded-xl">
                Google Play
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <GraduationCap className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-black text-primary tracking-tight">استاذي</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                المنصة التعليمية الأولى في العراق، نهدف للارتقاء بواقع التعليم من خلال دمج التكنولوجيا الحديثة بالكوادر التدريسية المتميزة.
              </p>
              <div className="flex gap-4 mt-8">
                <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors"><SiInstagram className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors"><SiWhatsapp className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors"><SiTiktok className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors"><SiYoutube className="w-5 h-5" /></a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6">روابط سريعة</h4>
              <ul className="space-y-4 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">عن المنصة</a></li>
                <li><a href="#teachers" className="hover:text-primary transition-colors">الأساتذة</a></li>
                <li><a href="#courses" className="hover:text-primary transition-colors">الدورات</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">اتصل بنا</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6">الشروط والأحكام</h4>
              <ul className="space-y-4 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">شروط الاستخدام</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">سياسة الاسترجاع</a></li>
                <li><a href="/admin/login" className="hover:text-primary transition-colors">تسجيل دخول الإدارة</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 text-center text-muted-foreground text-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} منصة استاذي التعليمية.</p>
            <p>صُنع بكل <span className="text-red-500">❤️</span> من أجل طلاب العراق</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
