import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminLogout, setAuthTokenGetter } from '@workspace/api-client-react';
import { adminFetch, clearAdminSession } from '@/lib/admin-fetch';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun, Lock, LogOut, ShieldCheck, Image, Plus, Trash2, ExternalLink, GripVertical } from 'lucide-react';

function useBanners() {
  return useQuery<any[]>({
    queryKey: ['admin-banners'],
    queryFn: () => adminFetch('/api/admin/banners').then(r => r.json()),
  });
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const logout = useAdminLogout();
  const qc = useQueryClient();

  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  // Banner form
  const [bannerForm, setBannerForm] = useState({ imageUrl: '', linkUrl: '' });
  const [bannerLoading, setBannerLoading] = useState(false);

  const { data: banners = [], isLoading: bannersLoading } = useBanners();

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
      toast({ title: 'يرجى ملء جميع الحقول', variant: 'destructive' }); return;
    }
    if (passForm.newPass !== passForm.confirm) {
      toast({ title: 'كلمتا المرور غير متطابقتين', variant: 'destructive' }); return;
    }
    if (passForm.newPass.length < 6) {
      toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' }); return;
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

  const handleAddBanner = async () => {
    if (!bannerForm.imageUrl.trim()) {
      toast({ title: 'يرجى إدخال رابط الصورة', variant: 'destructive' }); return;
    }
    setBannerLoading(true);
    try {
      await adminFetch('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: bannerForm.imageUrl.trim(), linkUrl: bannerForm.linkUrl.trim() || null, orderIndex: banners.length }),
      });
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({ title: 'تمت إضافة البانر' });
      setBannerForm({ imageUrl: '', linkUrl: '' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setBannerLoading(false);
    }
  };

  const handleToggleBanner = async (id: number, isActive: boolean) => {
    try {
      await adminFetch(`/api/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) });
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    } catch {}
  };

  const handleDeleteBanner = async (id: number) => {
    if (!confirm('هل تريد حذف هذا البانر؟')) return;
    try {
      await adminFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({ title: 'تم حذف البانر' });
    } catch {}
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات حساب المدير</p>
      </div>

      {/* ── Banners ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="w-4 h-4" />
            البانر الإعلاني
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Add banner form */}
          <div className="rounded-2xl border border-dashed border-border p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">إضافة بانر جديد</p>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">رابط الصورة *</label>
              <Input
                dir="ltr"
                placeholder="https://..."
                value={bannerForm.imageUrl}
                onChange={e => setBannerForm(p => ({ ...p, imageUrl: e.target.value }))}
              />
              {bannerForm.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-border aspect-[2.5/1]">
                  <img src={bannerForm.imageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">الرابط عند الضغط (اختياري)</label>
              <Input
                dir="ltr"
                placeholder="https://..."
                value={bannerForm.linkUrl}
                onChange={e => setBannerForm(p => ({ ...p, linkUrl: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleAddBanner}
              disabled={bannerLoading || !bannerForm.imageUrl}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              {bannerLoading ? 'جاري الإضافة...' : 'إضافة البانر'}
            </Button>
          </div>

          {/* Existing banners */}
          <div className="space-y-3">
            {bannersLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
            ) : banners.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بانرات بعد</p>
            ) : (
              banners.map((b, i) => (
                <div key={b.id} className="flex gap-3 items-center border border-border rounded-2xl p-3 bg-card">
                  {/* Preview */}
                  <div className="w-24 h-14 rounded-xl overflow-hidden shrink-0 bg-muted">
                    <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" dir="ltr">{b.imageUrl}</p>
                    {b.linkUrl && (
                      <div className="flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">{b.linkUrl}</p>
                      </div>
                    )}
                  </div>
                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={b.isActive}
                      onCheckedChange={v => handleToggleBanner(b.id, v)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteBanner(b.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

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
            <Switch checked={theme === 'dark'} onCheckedChange={v => setTheme(v ? 'dark' : 'light')} />
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
            <Input type="password" value={passForm.current} onChange={e => setPassForm(p => ({ ...p, current: e.target.value }))} placeholder="أدخل كلمة المرور الحالية" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">كلمة المرور الجديدة</label>
            <Input type="password" value={passForm.newPass} onChange={e => setPassForm(p => ({ ...p, newPass: e.target.value }))} placeholder="6 أحرف على الأقل" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">تأكيد كلمة المرور الجديدة</label>
            <Input type="password" value={passForm.confirm} onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))} placeholder="أعد كتابة كلمة المرور الجديدة" />
          </div>
          <Button onClick={handleChangePassword} disabled={passLoading} className="w-full">
            {passLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Account Info ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" />معلومات الحساب</CardTitle>
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
            <span className="font-medium">منصة الرؤية الذهبية التعليمية</span>
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
            <Button variant="destructive" className="gap-2" onClick={handleLogout} disabled={logout.isPending}>
              <LogOut className="w-4 h-4" />
              {logout.isPending ? 'جاري الخروج...' : 'تسجيل الخروج'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
