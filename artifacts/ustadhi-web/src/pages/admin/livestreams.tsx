import React, { useState } from 'react';
import { 
  useGetLivestreams, 
  useCreateLivestream, 
  useUpdateLivestream, 
  useDeleteLivestream,
  useGetTeachers,
  useGetCourses,
  getGetLivestreamsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Radio, PlayCircle, StopCircle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const livestreamSchema = z.object({
  title: z.string().min(2, 'العنوان مطلوب'),
  description: z.string().optional(),
  teacherId: z.coerce.number().min(1, 'الأستاذ مطلوب'),
  courseId: z.coerce.number().min(1, 'الدورة مطلوبة'),
  scheduledAt: z.string().min(1, 'الموعد مطلوب'),
});

const statusMap = {
  scheduled: { label: 'مجدول', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200' },
  live: { label: 'مباشر الآن', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 animate-pulse' },
  ended: { label: 'انتهى', color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300' },
};

export default function LivestreamsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: streams, isLoading } = useGetLivestreams();
  const { data: teachers } = useGetTeachers();
  const { data: courses } = useGetCourses();
  
  const createStream = useCreateLivestream();
  const updateStream = useUpdateLivestream();
  const deleteStream = useDeleteLivestream();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof livestreamSchema>>({
    resolver: zodResolver(livestreamSchema),
    defaultValues: { title: '', description: '', teacherId: 0, courseId: 0, scheduledAt: '' },
  });

  const onSubmit = (values: z.infer<typeof livestreamSchema>) => {
    const payload = { ...values, scheduledAt: new Date(values.scheduledAt).toISOString() };
    
    if (editId) {
      updateStream.mutate({ id: editId, data: payload as any }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetLivestreamsQueryKey() });
          setIsAddOpen(false); setEditId(null); form.reset();
        }
      });
    } else {
      createStream.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: 'تمت الجدولة بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetLivestreamsQueryKey() });
          setIsAddOpen(false); form.reset();
        }
      });
    }
  };

  const handleEdit = (stream: any) => {
    setEditId(stream.id);
    const dateStr = new Date(stream.scheduledAt).toISOString().slice(0, 16); // YYYY-MM-DDThh:mm
    form.reset({
      title: stream.title, description: stream.description || '',
      teacherId: stream.teacherId, courseId: stream.courseId,
      scheduledAt: dateStr
    });
    setIsAddOpen(true);
  };

  const handleStatusChange = (id: number, status: 'scheduled' | 'live' | 'ended') => {
    updateStream.mutate({ id, data: { status } as any }, {
      onSuccess: () => {
        toast({ title: 'تم تغيير حالة البث' });
        queryClient.invalidateQueries({ queryKey: getGetLivestreamsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا البث؟')) {
      deleteStream.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          queryClient.invalidateQueries({ queryKey: getGetLivestreamsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة البث المباشر</h1>
        
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open); if (!open) { setEditId(null); form.reset(); }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> جدولة بث جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editId ? 'تعديل البث' : 'جدولة بث مباشر'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({field}) => (
                  <FormItem><FormLabel>عنوان البث</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="teacherId" render={({field}) => (
                    <FormItem>
                      <FormLabel>الأستاذ</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر الأستاذ" /></SelectTrigger></FormControl>
                        <SelectContent>{teachers?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="courseId" render={({field}) => (
                    <FormItem>
                      <FormLabel>الدورة</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر الدورة" /></SelectTrigger></FormControl>
                        <SelectContent>{courses?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="scheduledAt" render={({field}) => (
                  <FormItem><FormLabel>موعد البث</FormLabel><FormControl><Input type="datetime-local" {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={createStream.isPending || updateStream.isPending}>حفظ</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : streams?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">لا يوجد بث مباشر مجدول</div>
        ) : (
          streams?.map((stream) => (
            <Card key={stream.id} className={`overflow-hidden border-2 transition-all ${stream.status === 'live' ? 'border-red-500 shadow-md shadow-red-500/20' : 'border-border'}`}>
              <CardContent className="p-0">
                <div className="p-6 bg-card">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className={`${statusMap[stream.status as keyof typeof statusMap].color} border gap-1 px-2 py-1 text-sm`}>
                      <Radio className="w-3 h-3" />
                      {statusMap[stream.status as keyof typeof statusMap].label}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(stream)}>
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(stream.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{stream.title}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>الأستاذ: <span className="font-medium text-foreground">{stream.teacherName}</span></p>
                    <p>الدورة: <span className="font-medium text-foreground">{stream.courseName}</span></p>
                    <div className="flex items-center gap-2 mt-4 text-primary font-medium">
                      <Calendar className="w-4 h-4" />
                      <span dir="ltr">{new Date(stream.scheduledAt).toLocaleString('ar-SA')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/50 p-4 border-t border-border flex justify-between items-center">
                  {stream.status === 'scheduled' && (
                    <Button onClick={() => handleStatusChange(stream.id, 'live')} className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white">
                      <PlayCircle className="w-5 h-5" /> بدء البث
                    </Button>
                  )}
                  {stream.status === 'live' && (
                    <Button onClick={() => handleStatusChange(stream.id, 'ended')} variant="outline" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50">
                      <StopCircle className="w-5 h-5" /> إنهاء البث
                    </Button>
                  )}
                  {stream.status === 'ended' && (
                    <div className="w-full text-center text-sm text-muted-foreground py-2">
                      انتهى البث
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
