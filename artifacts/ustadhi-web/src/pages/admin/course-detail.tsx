import React, { useState } from 'react';
import { useParams } from 'wouter';
import { 
  useGetCourse, 
  useGetLessons, 
  useCreateLesson, 
  useUpdateLesson, 
  useDeleteLesson,
  getGetLessonsQueryKey,
  getGetCourseQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Video, FileText, HelpCircle, Link as LinkIcon, Radio, MessageSquare, BookOpen, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const lessonSchema = z.object({
  title: z.string().min(2, 'عنوان الدرس مطلوب'),
  type: z.enum(['video', 'pdf', 'quiz', 'assignment', 'link', 'livestream', 'feedback']),
  contentUrl: z.string().optional(),
  contentText: z.string().optional(),
  duration: z.coerce.number().optional(),
  isPublished: z.boolean().default(true),
});

const lessonIcons: Record<string, React.ElementType> = {
  video: Video,
  pdf: FileText,
  quiz: HelpCircle,
  assignment: BookOpen,
  link: LinkIcon,
  livestream: Radio,
  feedback: MessageSquare,
};

const lessonTypesAr: Record<string, string> = {
  video: 'فيديو مسجل',
  pdf: 'ملف PDF',
  quiz: 'اختبار قصير',
  assignment: 'واجب',
  link: 'رابط خارجي',
  livestream: 'بث مباشر',
  feedback: 'استبيان / تقييم',
};

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: course, isLoading: isLoadingCourse } = useGetCourse(courseId, { query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) } });
  const { data: lessons, isLoading: isLoadingLessons } = useGetLessons(courseId, { query: { enabled: !!courseId, queryKey: getGetLessonsQueryKey(courseId) } });
  
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof lessonSchema>>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: '', type: 'video', contentUrl: '', contentText: '', duration: 0, isPublished: true },
  });

  const sortedLessons = lessons ? [...lessons].sort((a, b) => a.order - b.order) : [];

  const onSubmit = (values: z.infer<typeof lessonSchema>) => {
    if (editId) {
      updateLesson.mutate({ id: editId, data: values }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetLessonsQueryKey(courseId) });
          setIsAddOpen(false); setEditId(null); form.reset();
        }
      });
    } else {
      const maxOrder = sortedLessons.length > 0 ? Math.max(...sortedLessons.map(l => l.order)) : 0;
      createLesson.mutate({ data: { ...values, courseId, order: maxOrder + 1 } as any }, {
        onSuccess: () => {
          toast({ title: 'تمت الإضافة بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetLessonsQueryKey(courseId) });
          setIsAddOpen(false); form.reset();
        }
      });
    }
  };

  const handleEdit = (lesson: any) => {
    setEditId(lesson.id);
    form.reset({
      title: lesson.title, type: lesson.type, 
      contentUrl: lesson.contentUrl || '', contentText: lesson.contentText || '',
      duration: lesson.duration || 0, isPublished: lesson.isPublished
    });
    setIsAddOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
      deleteLesson.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          queryClient.invalidateQueries({ queryKey: getGetLessonsQueryKey(courseId) });
        }
      });
    }
  };

  const handleReorder = (id: number, currentOrder: number, direction: 'up' | 'down') => {
    const currentIndex = sortedLessons.findIndex(l => l.id === id);
    if (direction === 'up' && currentIndex > 0) {
      const prev = sortedLessons[currentIndex - 1];
      updateLesson.mutate({ id, data: { order: prev.order } }, { onSuccess: () => {
        updateLesson.mutate({ id: prev.id, data: { order: currentOrder } }, { onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLessonsQueryKey(courseId) });
        }});
      }});
    } else if (direction === 'down' && currentIndex < sortedLessons.length - 1) {
      const next = sortedLessons[currentIndex + 1];
      updateLesson.mutate({ id, data: { order: next.order } }, { onSuccess: () => {
        updateLesson.mutate({ id: next.id, data: { order: currentOrder } }, { onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLessonsQueryKey(courseId) });
        }});
      }});
    }
  };

  if (isLoadingCourse) return <div className="p-8 text-center">جاري تحميل الدورة...</div>;
  if (!course) return <div className="p-8 text-center text-red-500">لم يتم العثور على الدورة</div>;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border flex flex-col md:flex-row gap-6">
        {course.thumbnailUrl && (
          <div className="w-full md:w-64 aspect-video rounded-lg overflow-hidden shrink-0">
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{course.title}</h1>
              <p className="text-muted-foreground mt-2">
                الأستاذ: {course.teacherName} • المادة: {course.subjectName}
              </p>
            </div>
            <Badge variant={course.isPublished ? 'default' : 'secondary'} className="text-lg py-1 px-3">
              {course.isPublished ? 'منشورة' : 'مسودة'}
            </Badge>
          </div>
          <p className="mt-4 text-foreground/80 leading-relaxed">{course.description}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">محتوى الدورة ({lessons?.length || 0} دروس)</h2>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open); if (!open) { setEditId(null); form.reset(); }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> إضافة درس</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'تعديل الدرس' : 'إضافة درس جديد'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({field}) => (
                  <FormItem><FormLabel>عنوان الدرس</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({field}) => (
                    <FormItem>
                      <FormLabel>نوع الدرس</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(lessonTypesAr).map(([key, val]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                {React.createElement(lessonIcons[key], { className: "w-4 h-4" })}
                                <span>{val}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="duration" render={({field}) => (
                    <FormItem><FormLabel>المدة (بالدقائق)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                </div>
                
                {form.watch('type') === 'video' || form.watch('type') === 'pdf' || form.watch('type') === 'link' ? (
                  <FormField control={form.control} name="contentUrl" render={({field}) => (
                    <FormItem><FormLabel>رابط المحتوى (URL)</FormLabel><FormControl><Input dir="ltr" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                ) : null}

                {form.watch('type') === 'assignment' || form.watch('type') === 'feedback' ? (
                  <FormField control={form.control} name="contentText" render={({field}) => (
                    <FormItem><FormLabel>نص المحتوى / الوصف</FormLabel><FormControl><Textarea className="h-32" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                ) : null}

                <FormField control={form.control} name="isPublished" render={({field}) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-md border p-4 mt-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>نشر الدرس</FormLabel>
                      <p className="text-sm text-muted-foreground">الدروس غير المنشورة لن تظهر للطلاب</p>
                    </div>
                  </FormItem>
                )} />

                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={createLesson.isPending || updateLesson.isPending}>حفظ الدرس</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {isLoadingLessons ? (
          <div className="text-center py-8 text-muted-foreground">جاري تحميل الدروس...</div>
        ) : sortedLessons.length === 0 ? (
          <Card className="bg-muted/30 border-dashed"><CardContent className="py-12 text-center text-muted-foreground">لا يوجد دروس في هذه الدورة حتى الآن.</CardContent></Card>
        ) : (
          sortedLessons.map((lesson, index) => {
            const Icon = lessonIcons[lesson.type] || FileText;
            return (
              <Card key={lesson.id} className={`overflow-hidden transition-all hover:border-primary/30 ${!lesson.isPublished ? 'opacity-70 bg-muted/50' : ''}`}>
                <div className="flex items-center p-4 gap-4">
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => handleReorder(lesson.id, lesson.order, 'up')}>
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === sortedLessons.length - 1} onClick={() => handleReorder(lesson.id, lesson.order, 'down')}>
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    lesson.type === 'video' ? 'bg-blue-100 text-blue-600' :
                    lesson.type === 'quiz' ? 'bg-purple-100 text-purple-600' :
                    lesson.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{lesson.title}</h3>
                      {!lesson.isPublished && <Badge variant="secondary" className="text-xs">مسودة</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{lessonTypesAr[lesson.type]}</span>
                      {lesson.duration ? <span>• {lesson.duration} دقيقة</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {lesson.type === 'quiz' && (
                      <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                        <HelpCircle className="w-4 h-4" /> إدارة الأسئلة
                      </Button>
                    )}
                    <Button variant="secondary" size="icon" onClick={() => handleEdit(lesson)}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => handleDelete(lesson.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
