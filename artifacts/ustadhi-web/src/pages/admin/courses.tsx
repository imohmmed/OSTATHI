import React, { useState } from 'react';
import { 
  useGetCourses, 
  useCreateCourse, 
  useUpdateCourse, 
  useDeleteCourse,
  useGetSubjects,
  useGetTeachers,
  getGetCoursesQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
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
import { Plus, Search, Edit, Trash2, Video, Users, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const courseSchema = z.object({
  title: z.string().min(2, 'عنوان الدورة مطلوب'),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  subjectId: z.coerce.number().min(1, 'المادة مطلوبة'),
  teacherId: z.coerce.number().min(1, 'الأستاذ مطلوب'),
  isPublished: z.boolean().default(false),
  isTrial: z.boolean().default(false),
});

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: courses, isLoading } = useGetCourses();
  const { data: subjects } = useGetSubjects();
  const { data: teachers } = useGetTeachers();
  
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: { title: '', description: '', thumbnailUrl: '', subjectId: 0, teacherId: 0, isPublished: false, isTrial: false },
  });

  const onSubmit = (values: z.infer<typeof courseSchema>) => {
    if (editId) {
      updateCourse.mutate({ id: editId, data: values }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
          setIsAddOpen(false); setEditId(null); form.reset();
        }
      });
    } else {
      createCourse.mutate({ data: values }, {
        onSuccess: () => {
          toast({ title: 'تمت الإضافة بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
          setIsAddOpen(false); form.reset();
        }
      });
    }
  };

  const handleEdit = (e: React.MouseEvent, course: any) => {
    e.preventDefault();
    setEditId(course.id);
    form.reset({
      title: course.title, description: course.description || '', 
      thumbnailUrl: course.thumbnailUrl || '', subjectId: course.subjectId,
      teacherId: course.teacherId, isPublished: course.isPublished, isTrial: course.isTrial ?? false
    });
    setIsAddOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (confirm('هل أنت متأكد من حذف هذه الدورة ومحتواها؟')) {
      deleteCourse.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
        }
      });
    }
  };

  const filteredCourses = courses?.filter(c => 
    c.title.includes(searchTerm) || c.subjectName?.includes(searchTerm) || c.teacherName?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة الدورات</h1>
        <div className="flex w-full sm:w-auto gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث عن دورة..." className="pr-9"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open); if (!open) { setEditId(null); form.reset(); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> إضافة دورة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? 'تعديل دورة' : 'إنشاء دورة جديدة'}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({field}) => (
                    <FormItem><FormLabel>عنوان الدورة</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="subjectId" render={({field}) => (
                      <FormItem>
                        <FormLabel>المادة الدراسية</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {subjects?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="teacherId" render={({field}) => (
                      <FormItem>
                        <FormLabel>الأستاذ</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر الأستاذ" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {teachers?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="description" render={({field}) => (
                    <FormItem><FormLabel>وصف الدورة</FormLabel><FormControl><Textarea {...field} className="h-24"/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="thumbnailUrl" render={({field}) => (
                    <FormItem><FormLabel>رابط صورة الغلاف</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="isPublished" render={({field}) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-xl border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>نشر الدورة</FormLabel>
                        <p className="text-sm text-muted-foreground">عند تفعيل هذا الخيار ستكون الدورة مرئية للطلاب.</p>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isTrial" render={({field}) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-amber-700 dark:text-amber-400">محاضرة تجريبية</FormLabel>
                        <p className="text-sm text-muted-foreground">تُعرض هذه الدورة كمحاضرة تجريبية في صفحة الأستاذ لجذب الطلاب.</p>
                      </div>
                    </FormItem>
                  )} />
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={createCourse.isPending || updateCourse.isPending}>حفظ</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : filteredCourses?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">لا يوجد دورات</div>
        ) : (
          filteredCourses?.map((course) => (
            <Link key={course.id} href={`/admin/courses/${course.id}`}>
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 group flex flex-col h-full">
                <div className="aspect-video bg-muted relative overflow-hidden flex items-center justify-center">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-12 h-12 text-muted-foreground/30" />
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                      {course.isPublished ? 'منشورة' : 'مسودة'}
                    </Badge>
                  </div>
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" className="h-8 w-8 bg-white text-blue-600 hover:bg-gray-100 shadow-sm" onClick={(e) => handleEdit(e, course)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" className="h-8 w-8 bg-white text-red-600 hover:bg-gray-100 shadow-sm" onClick={(e) => handleDelete(e, course.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-lg font-bold line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{course.subjectName} • {course.teacherName}</p>
                  
                  <div className="mt-auto pt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.lessonsCount || 0} درس</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{course.studentsCount || 0} طالب</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
