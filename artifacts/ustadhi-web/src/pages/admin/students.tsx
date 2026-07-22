import React, { useState } from 'react';
import {
  useGetStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useGetTeachers,
  useGetSubjects,
  getGetStudentsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

const studentSchema = z.object({
  fullName: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  gradeLevel: z.string().min(1, 'المرحلة الدراسية مطلوبة'),
  username: z.string().min(3, 'اسم المستخدم مطلوب'),
  password: z.string().optional(),
  teacherId: z.coerce.number().optional(),
  subjectId: z.coerce.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof studentSchema>;

const GRADE_LEVELS = [
  'الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي',
  'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي',
  'الأول المتوسط', 'الثاني المتوسط', 'الثالث المتوسط',
  'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي',
];

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editStudentId, setEditStudentId] = useState<number | null>(null);

  const { data: students, isLoading } = useGetStudents({ search: searchTerm });
  const { data: teachers } = useGetTeachers();
  const { data: subjects } = useGetSubjects();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: '', phone: '', email: '', gradeLevel: '', username: '',
      password: '', teacherId: undefined, subjectId: undefined, notes: '', isActive: true,
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: any = {
      ...values,
      email: values.email || null,
      teacherId: values.teacherId || null,
      subjectId: values.subjectId || null,
    };

    if (editStudentId) {
      if (!payload.password) delete payload.password;
      updateStudent.mutate({ id: editStudentId, data: payload }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
          setIsAddOpen(false); setEditStudentId(null); form.reset();
        },
        onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
      });
    } else {
      if (!payload.password) {
        toast({ title: 'كلمة المرور مطلوبة', variant: 'destructive' }); return;
      }
      createStudent.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: 'تمت إضافة الطالب بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
          setIsAddOpen(false); form.reset();
        },
        onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
      });
    }
  };

  const handleEdit = (student: any) => {
    setEditStudentId(student.id);
    form.reset({
      fullName: student.fullName,
      phone: student.phone,
      email: student.email || '',
      gradeLevel: student.gradeLevel,
      username: student.username,
      password: '',
      teacherId: student.teacherId ?? undefined,
      subjectId: student.subjectId ?? undefined,
      notes: student.notes || '',
      isActive: student.isActive,
    });
    setIsAddOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      deleteStudent.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة الطلاب</h1>
        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو رقم الهاتف..."
              className="pr-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) { setEditStudentId(null); form.reset(); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="w-4 h-4" /> إضافة طالب
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editStudentId ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                  {/* Section: بيانات شخصية */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">البيانات الشخصية</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم الكامل *</FormLabel>
                          <FormControl><Input placeholder="اسم الطالب بالكامل" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف *</FormLabel>
                          <FormControl><Input placeholder="07xxxxxxxxx" dir="ltr" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl><Input placeholder="example@gmail.com" dir="ltr" type="email" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="gradeLevel" render={({ field }) => (
                        <FormItem>
                          <FormLabel>المرحلة الدراسية / الصف *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر الصف الدراسي" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* Section: تعيين الأستاذ والمادة */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">التعيين الدراسي</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="teacherId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الأستاذ</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val === 'none' ? undefined : Number(val))}
                            value={field.value ? String(field.value) : 'none'}
                          >
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر الأستاذ" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="none">— بدون تعيين —</SelectItem>
                              {teachers?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="subjectId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>المادة الدراسية</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val === 'none' ? undefined : Number(val))}
                            value={field.value ? String(field.value) : 'none'}
                          >
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="none">— بدون تعيين —</SelectItem>
                              {subjects?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* Section: حساب الدخول */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">حساب الدخول</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="username" render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المستخدم *</FormLabel>
                          <FormControl><Input placeholder="student_name" dir="ltr" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور {editStudentId && <span className="text-muted-foreground">(اتركها فارغة للإبقاء على القديمة)</span>}</FormLabel>
                          <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl><Input placeholder="أي ملاحظة إضافية..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
                    <Button type="submit" disabled={createStudent.isPending || updateStudent.isPending}>
                      {(createStudent.isPending || updateStudent.isPending) ? 'جاري الحفظ...' : 'حفظ البيانات'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>الصف</TableHead>
              <TableHead>الأستاذ</TableHead>
              <TableHead>المادة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">جاري التحميل...</TableCell>
              </TableRow>
            ) : !students?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">لا يوجد طلاب مسجلون</TableCell>
              </TableRow>
            ) : (
              students.map((student: any) => (
                <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Link href={`/admin/students/${student.id}`}>
                      <div className="font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1">
                        {student.fullName}
                        <ChevronLeft className="w-3 h-3 opacity-50" />
                      </div>
                      {student.email && <div className="text-xs text-muted-foreground" dir="ltr">{student.email}</div>}
                    </Link>
                  </TableCell>
                  <TableCell dir="ltr" className="text-right">{student.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{student.gradeLevel}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{student.teacherName ?? <span className="text-muted-foreground/50">—</span>}</TableCell>
                  <TableCell className="text-sm">{student.subjectName ?? <span className="text-muted-foreground/50">—</span>}</TableCell>
                  <TableCell>
                    {student.isActive ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1">
                        <CheckCircle className="w-3 h-3" /> نشط
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1">
                        <XCircle className="w-3 h-3" /> غير نشط
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(student)} title="تعديل">
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)} title="حذف">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
