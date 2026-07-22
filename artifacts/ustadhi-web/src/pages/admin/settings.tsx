import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminLogout, setAuthTokenGetter } from '@workspace/api-client-react';
import { adminFetch, clearAdminSession } from '@/lib/admin-fetch';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Moon, Sun, Lock, LogOut, ShieldCheck, Image, Plus, Trash2, ExternalLink,
  ThumbsUp, ThumbsDown, Star, MessageSquare, Upload, X, Video,
} from 'lucide-react';

/* ── hooks ── */
function useBanners() {
  return useQuery<any[]>({
    queryKey: ['admin-banners'],
    queryFn: () => adminFetch<any[]>('/api/admin/banners'),
  });
}
function useTeacherReviews() {
  return useQuery<any[]>({
    queryKey: ['teacher-reviews'],
    queryFn: () => adminFetch<any[]>('/api/teacher-reviews'),
  });
}

/* ── helpers ── */
async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

type SettingsTab = 'banners' | 'reviews' | 'theme' | 'password' | 'account';

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const logout = useAdminLogout();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('banners');

  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  // Banner state
  const [bannerMediaFile, setBannerMediaFile] = useState<File | null>(null);
  const [bannerMediaPreview, setBannerMediaPreview] = useState('');
  const [bannerMediaUrl, setBannerMediaUrl] = useState('');
  const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload');
  const [bannerLinkUrl, setBannerLinkUrl] = useState('');
  const [bannerLoading, setBannerLoading] = useState(false);

  const { data: banners = [], isLoading: bannersLoading } = useBanners();
  const { data: teacherReviews = [], isLoading: reviewsLoading } = useTeacherReviews();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => { clearAdminSession(); setAuthTokenGetter(null); setLocation('/admin/login'); },
    });
  };

  const handleChangePassword = async () => {
    if (!passForm.current || !passForm.newPass || !passForm.confirm) {
      toast({ title: 'يرجى ملء جميع الحقول', variant: 'destructive' }); return;
    }
    if (passForm.newPass !== passForm.confirm) {
      toast({ title: 'كلمتا المرور غير متطابقتين', variant: 'destructive' }); return;
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
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setPassLoading(false); }
  };

  const handleAddBanner = async () => {
    setBannerLoading(true);
    try {
      let mediaUrl = bannerMediaUrl.trim();
      let mediaType = 'image';

      if (bannerInputMode === 'upload' && bannerMediaFile) {
        const b64 = await toBase64(bannerMediaFile);
        const result = await adminFetch<any>('/api/upload/image', {
          method: 'POST',
          body: JSON.stringify({ data: b64, mimeType: bannerMediaFile.type, filename: 'banner' }),
        });
        mediaUrl = result.url;
        mediaType = bannerMediaFile.type.startsWith('video') ? 'video' : 'image';
      } else if (bannerInputMode === 'url' && bannerMediaUrl) {
        mediaType = bannerMediaUrl.match(/\.(mp4|mov|webm|m3u8)$/i) ? 'video' : 'image';
      }

      if (!mediaUrl) { toast({ title: 'يرجى إضافة صورة أو رابط', variant: 'destructive' }); return; }

      await adminFetch('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: mediaUrl,
          linkUrl: bannerLinkUrl.trim() || null,
          orderIndex: banners.length,
          mediaType,
        }),
      });
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({ title: 'تمت إضافة البانر' });
      setBannerMediaFile(null); setBannerMediaPreview(''); setBannerMediaUrl(''); setBannerLinkUrl('');
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setBannerLoading(false); }
  };

  const handleToggleBanner = async (id: number, isActive: boolean) => {
    try {
      await adminFetch(`/api/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) });
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    } catch { }
  };

  const handleDeleteBanner = async (id: number) => {
    if (!confirm('هل تريد حذف هذا البانر؟')) return;
    try {
      await adminFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({ title: 'تم حذف البانر' });
    } catch { }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm('حذف هذا التقييم؟')) return;
    try {
      await adminFetch(`/api/teacher-reviews/${id}`, { method: 'DELETE' });
      qc.invalidateQueries({ queryKey: ['teacher-reviews'] });
      toast({ title: 'تم الحذف' });
    } catch { }
  };

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'banners', label: 'البانر', icon: <Image className="w-4 h-4" /> },
    { key: 'reviews', label: 'التقييمات', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'theme', label: 'المظهر', icon: <Sun className="w-4 h-4" /> },
    { key: 'password', label: 'كلمة المرور', icon: <Lock className="w-4 h-4" /> },
    { key: 'account', label: 'الحساب', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const likedCount = teacherReviews.filter((r: any) => r.liked).length;
  const dislikedCount = teacherReviews.filter((r: any) => !r.liked).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات حساب المدير</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border overflow-x-auto pb-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}{tab.label}
            {tab.key === 'reviews' && teacherReviews.length > 0 && (
              <Badge className="ml-1 h-5 text-[10px] px-1.5">{teacherReviews.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── BANNERS ── */}
      {activeTab === 'banners' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="w-4 h-4" /> البانر الإعلاني
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-dashed border-border p-4 space-y-4 bg-muted/30">
              <p className="text-sm font-medium">إضافة بانر جديد</p>

              {/* Mode selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setBannerInputMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-colors ${bannerInputMode === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  <Upload className="w-4 h-4" /> رفع صورة/فيديو
                </button>
                <button
                  onClick={() => setBannerInputMode('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-colors ${bannerInputMode === 'url' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  <ExternalLink className="w-4 h-4" /> إدخال رابط
                </button>
              </div>

              {bannerInputMode === 'upload' ? (
                <div>
                  {bannerMediaPreview ? (
                    <div className="relative rounded-xl overflow-hidden aspect-[2.5/1] border border-border">
                      {bannerMediaFile?.type.startsWith('video')
                        ? <video src={bannerMediaPreview} className="w-full h-full object-cover" muted />
                        : <img src={bannerMediaPreview} className="w-full h-full object-cover" alt="" />}
                      <button
                        onClick={() => { setBannerMediaFile(null); setBannerMediaPreview(''); }}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/40 transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">صورة أو فيديو للبانر</span>
                      <input type="file" accept="image/*,video/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setBannerMediaFile(f); setBannerMediaPreview(URL.createObjectURL(f)); } }} />
                    </label>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">رابط الصورة أو الفيديو *</label>
                  <Input dir="ltr" placeholder="https://..." value={bannerMediaUrl} onChange={e => setBannerMediaUrl(e.target.value)} />
                  {bannerMediaUrl && (
                    <div className="rounded-xl overflow-hidden border border-border aspect-[2.5/1]">
                      {bannerMediaUrl.match(/\.(mp4|mov|webm)$/i)
                        ? <video src={bannerMediaUrl} className="w-full h-full object-cover" muted />
                        : <img src={bannerMediaUrl} alt="preview" className="w-full h-full object-cover" />}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">الرابط عند الضغط (اختياري)</label>
                <Input dir="ltr" placeholder="https://..." value={bannerLinkUrl} onChange={e => setBannerLinkUrl(e.target.value)} />
              </div>

              <Button
                onClick={handleAddBanner}
                disabled={bannerLoading || (!bannerMediaFile && !bannerMediaUrl.trim())}
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
                banners.map(b => (
                  <div key={b.id} className="flex gap-3 items-center border border-border rounded-2xl p-3 bg-card">
                    <div className="w-24 h-14 rounded-xl overflow-hidden shrink-0 bg-muted">
                      {b.mediaType === 'video'
                        ? <video src={b.imageUrl} className="w-full h-full object-cover" muted />
                        : <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {b.mediaType === 'video'
                          ? <Video className="w-3 h-3 text-muted-foreground shrink-0" />
                          : <Image className="w-3 h-3 text-muted-foreground shrink-0" />}
                        <p className="text-xs font-medium truncate" dir="ltr">{b.imageUrl}</p>
                      </div>
                      {b.linkUrl && (
                        <div className="flex items-center gap-1 mt-1">
                          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground truncate" dir="ltr">{b.linkUrl}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={b.isActive} onCheckedChange={v => handleToggleBanner(b.id, v)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDeleteBanner(b.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── REVIEWS (تقييمات) ── */}
      {activeTab === 'reviews' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> تقييمات المحاضرات التجريبية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary row */}
            {teacherReviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-muted/40 p-3 text-center">
                  <div className="text-2xl font-bold">{teacherReviews.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">إجمالي التقييمات</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{likedCount}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">أعجبني 👍</div>
                </div>
                <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">{dislikedCount}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">لم يعجبني 👎</div>
                </div>
              </div>
            )}

            {reviewsLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">جاري التحميل...</p>
            ) : teacherReviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground text-sm">لا توجد تقييمات بعد</p>
                <p className="text-xs text-muted-foreground mt-1">تظهر هنا بعد مشاهدة الطلاب للمحاضرات التجريبية</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teacherReviews.map((r: any) => (
                  <div key={r.id} className={`rounded-2xl border p-4 space-y-2 ${r.liked ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10' : 'border-red-200 bg-red-50/50 dark:bg-red-950/10'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {r.liked
                          ? <ThumbsUp className="w-4 h-4 text-emerald-600" />
                          : <ThumbsDown className="w-4 h-4 text-red-500" />}
                        <span className={`text-sm font-medium ${r.liked ? 'text-emerald-600' : 'text-red-500'}`}>
                          {r.liked ? 'أعجبني' : 'لم يعجبني'}
                        </span>
                        <Badge variant="outline" className="text-xs">{r.teacherName || 'أستاذ'}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' })}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50" onClick={() => handleDeleteReview(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {r.studentName && (
                      <p className="text-xs text-muted-foreground">الطالب: {r.studentName}</p>
                    )}
                    {!r.liked && r.reason && (
                      <div className="bg-white/60 dark:bg-black/10 rounded-xl px-3 py-2">
                        <p className="text-sm">{r.reason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── THEME ── */}
      {activeTab === 'theme' && (
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
      )}

      {/* ── PASSWORD ── */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" />تغيير كلمة المرور</CardTitle>
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
              <Input type="password" value={passForm.confirm} onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))} placeholder="أعد كتابة كلمة المرور" />
            </div>
            <Button onClick={handleChangePassword} disabled={passLoading} className="w-full">
              {passLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── ACCOUNT ── */}
      {activeTab === 'account' && (
        <>
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
        </>
      )}
    </div>
  );
}
