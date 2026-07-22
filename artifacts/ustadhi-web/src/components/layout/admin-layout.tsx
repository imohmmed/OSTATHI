import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  useGetAdminMe,
  useAdminLogout,
} from '@workspace/api-client-react';
import {
  LayoutDashboard, Users, GraduationCap, UserCheck, BookOpen,
  Video, Star, Radio, Bell, LogOut, Moon, Sun, Menu, Settings, MessageCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { clearAdminSession } from '@/lib/admin-fetch';
import { setAuthTokenGetter } from '@workspace/api-client-react';

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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!admin) return null;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        clearAdminSession();
        setAuthTokenGetter(null);
        setLocation('/admin/login');
      },
    });
  };

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم' },
    { href: '/admin/students', icon: Users, label: 'الطلاب' },
    { href: '/admin/teachers', icon: GraduationCap, label: 'الأساتذة' },
    { href: '/admin/subjects', icon: BookOpen, label: 'المواد الدراسية' },
    { href: '/admin/courses', icon: Video, label: 'الدورات' },
    { href: '/admin/assistants', icon: UserCheck, label: 'المساعدون' },
    { href: '/admin/parents', icon: Users, label: 'أولياء الأمور' },
    { href: '/admin/reviews', icon: Star, label: 'التقييمات' },
    { href: '/admin/livestreams', icon: Radio, label: 'البث المباشر' },
    { href: '/admin/notifications', icon: Bell, label: 'الإشعارات' },
    { href: '/admin/feedback', icon: MessageCircle, label: 'Feedback' },
    { href: '/admin/settings', icon: Settings, label: 'الإعدادات' },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? location === '/admin' : location.startsWith(href);

  const NavLinks = () => (
    <>
      <div className="p-6 border-b border-border">
        <Link href="/">
          <h2 className="text-xl font-bold text-primary dark:text-white cursor-pointer">منصة الرؤية الذهبية</h2>
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">لوحة الإدارة</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">م</div>
          <span className="text-sm font-medium">{admin.username}</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-sm ${
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border space-y-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-3"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-sm">{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="w-full justify-start gap-3"
          onClick={handleLogout}
          disabled={logout.isPending}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">تسجيل الخروج</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <h2 className="text-lg font-bold text-primary dark:text-white">منصة الرؤية الذهبية</h2>
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
      <aside className="hidden md:flex w-60 flex-col border-l border-border bg-card shadow-sm h-screen sticky top-0">
        <NavLinks />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
