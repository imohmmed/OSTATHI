import React, { useState } from 'react';
import { 
  useGetNotifications, 
  useCreateNotification, 
  useDeleteNotification,
  getGetNotificationsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bell, Send, Trash2, Users, GraduationCap, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const notificationSchema = z.object({
  title: z.string().min(2, 'العنوان مطلوب'),
  body: z.string().min(5, 'نص الإشعار مطلوب'),
  targetAudience: z.enum(['all', 'students', 'teachers', 'parents']),
});

const audienceMap = {
  all: { label: 'الجميع', icon: Users, color: 'bg-blue-100 text-blue-700' },
  students: { label: 'الطلاب فقط', icon: Users, color: 'bg-green-100 text-green-700' },
  teachers: { label: 'الأساتذة فقط', icon: GraduationCap, color: 'bg-purple-100 text-purple-700' },
  parents: { label: 'أولياء الأمور فقط', icon: UserCheck, color: 'bg-orange-100 text-orange-700' },
};

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useGetNotifications();
  const createNotification = useCreateNotification();
  const deleteNotification = useDeleteNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { title: '', body: '', targetAudience: 'all' },
  });

  const onSubmit = (values: z.infer<typeof notificationSchema>) => {
    createNotification.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: 'تم إرسال الإشعار بنجاح' });
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        form.reset();
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      deleteNotification.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">الإشعارات</h1>
        <p className="text-muted-foreground mt-2">إرسال تنبيهات وإشعارات لمستخدمي المنصة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Send Form */}
        <Card className="lg:col-span-1 shadow-sm h-fit">
          <CardHeader className="bg-primary/5 border-b border-border pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> إرسال إشعار جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({field}) => (
                  <FormItem><FormLabel>عنوان الإشعار</FormLabel><FormControl><Input placeholder="تنبيه هام..." {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="targetAudience" render={({field}) => (
                  <FormItem>
                    <FormLabel>الجمهور المستهدف</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(audienceMap).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <val.icon className="w-4 h-4" /> {val.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="body" render={({field}) => (
                  <FormItem><FormLabel>نص الإشعار</FormLabel><FormControl><Textarea className="h-32 resize-none" placeholder="اكتب تفاصيل الإشعار هنا..." {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <Button type="submit" className="w-full gap-2" disabled={createNotification.isPending}>
                  <Send className="w-4 h-4" /> إرسال الآن
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-muted-foreground" /> سجل الإشعارات المرسلة
          </h2>
          
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-border">جاري التحميل...</div>
            ) : notifications?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-border">لا يوجد إشعارات سابقة</div>
            ) : (
              notifications?.map((notification) => {
                const audience = audienceMap[notification.targetAudience as keyof typeof audienceMap] || audienceMap.all;
                return (
                  <Card key={notification.id} className="overflow-hidden group">
                    <div className="p-5 flex gap-4">
                      <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${audience.color}`}>
                        <audience.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg">{notification.title}</h3>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(notification.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-muted-foreground mt-1">{notification.body}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="bg-muted px-2 py-1 rounded-xl">إلى: {audience.label}</span>
                          <span dir="ltr">{new Date(notification.createdAt).toLocaleString('ar-SA')}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
