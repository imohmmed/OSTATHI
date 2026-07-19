import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminLogout, setAuthTokenGetter } from '@workspace/api-client-react';
import { adminFetch, clearAdminSession } from '@/lib/admin-fetch';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun, Lock, LogOut, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const logout = useAdminLogout();

  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        clearAdminSession();
        setAuthTokenGetter(null);
        setLocation('/admin/login');
      },
    });
  };

  const handleChangePassword = async () => {
    if (!passForm.current || !passForm.newPass || !passForm.confirm) {
      toast({ title: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }
    if (passForm.newPass !== passForm.confirm) {
      toast({ title: 'كلمتا المرور غير متطابقتين', variant: 'destructive' });
      return;
    }
    if (passForm.newPass.length < 6) {
      toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }
    setPassLoading(true);
    try {
      await adminFetch('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: passForm.current, newPassword: passForm.newPass }),
      });
      toast({ title: 'تم تغيير كلمة المرور بنجاح' });
      setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message || 'فشل تغيير كلمة المرور', variant: 'destructive' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات حساب المدير</p>
      </div>

      {/* ── Theme ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            مظهر الواجهة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">الوضع الليلي</p>
              <p className="text-xs text-muted-foreground mt-0.5">تبديل بين المظهر الفاتح والداكن</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={v => setTheme(v ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Change Password ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">كلمة المرور الحالية</label>
            <Input
              type="password"
              value={passForm.current}
              onChange={e => setPassForm(p => ({ ...p, current: e.target.value }))}
              placeholder="أدخل كلمة المرور الحالية"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">كلمة المرور الجديدة</label>
            <Input
              type="password"
              value={passForm.newPass}
              onChange={e => setPassForm(p => ({ ...p, newPass: e.target.value }))}
              placeholder="6 أحرف على الأقل"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">تأكيد كلمة المرور الجديدة</label>
            <Input
              type="password"
              value={passForm.confirm}
              onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="أعد كتابة كلمة المرور الجديدة"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={passLoading} className="w-full">
            {passLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Account Info ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            معلومات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">اسم المستخدم</span>
            <span className="font-medium" dir="ltr">admin</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">مستوى الصلاحية</span>
            <span className="font-medium">مدير النظام</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">المنصة</span>
            <span className="font-medium">منصة استاذي التعليمية</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Logout ── */}
      <Card className="border-red-200 dark:border-red-900">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-red-600">تسجيل الخروج</p>
              <p className="text-sm text-muted-foreground mt-0.5">ستحتاج إلى تسجيل الدخول مجدداً</p>
            </div>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleLogout}
              disabled={logout.isPending}
            >
              <LogOut className="w-4 h-4" />
              {logout.isPending ? 'جاري الخروج...' : 'تسجيل الخروج'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
