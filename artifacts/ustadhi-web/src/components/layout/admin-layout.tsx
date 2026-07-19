import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  useGetAdminMe, 
  useAdminLogout 
} from '@workspace/api-client-react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  UserCheck, 
  BookOpen, 
  Video, 
  Star, 
  Radio, 
  Bell, 
  LogOut,
  Moon,
  Sun,
  Menu
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: admin, isLoading, isError } = useGetAdminMe();
  const logout = useAdminLogout();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if ((!isLoading && !admin) || isError) {
      setLocation('/admin/login');
    }
  }, [admin, isLoading, isError, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!admin) return null;

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم' },
    { href: '/admin/students', icon: Users, label: 'الطلاب' },
    { href: '/admin/teachers', icon: GraduationCap, label: 'الأساتذة' },
    { href: '/admin/assistants', icon: UserCheck, label: 'المساعدون' },
    { href: '/admin/parents', icon: Users, label: 'أولياء الأمور' },
    { href: '/admin/subjects', icon: BookOpen, label: 'المواد الدراسية' },
    { href: '/admin/courses', icon: Video, label: 'الدورات' },
    { href: '/admin/reviews', icon: Star, label: 'التقييمات' },
    { href: '/admin/livestreams', icon: Radio, label: 'البث المباشر' },
    { href: '/admin/notifications', icon: Bell, label: 'الإشعارات' },
  ];

  const NavLinks = () => (
    <>
      <div className="p-6">
        <Link href="/">
          <h2 className="text-2xl font-bold text-primary dark:text-white cursor-pointer">منصة استاذي</h2>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">لوحة الإدارة</p>
      </div>
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border mt-auto space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
        </Button>
        <Button 
          variant="destructive" 
          className="w-full justify-start gap-3" 
          onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation('/admin/login') })}
          disabled={logout.isPending}
        >
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <h2 className="text-xl font-bold text-primary dark:text-white">منصة استاذي</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0 flex flex-col">
            <NavLinks />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-l border-border bg-card shadow-sm h-screen sticky top-0">
        <NavLinks />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
