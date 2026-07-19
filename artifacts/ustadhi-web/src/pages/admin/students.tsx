import React, { useState } from 'react';
import { 
  useGetStudents, 
  useCreateStudent, 
  useUpdateStudent, 
  useDeleteStudent,
  getGetStudentsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const studentSchema = z.object({
  fullName: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف مطلوب'),
  gradeLevel: z.string().min(1, 'المرحلة الدراسية مطلوبة'),
  username: z.string().min(3, 'اسم المستخدم مطلوب'),
  password: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editStudentId, setEditStudentId] = useState<number | null>(null);

  const { data: students, isLoading } = useGetStudents({ search: searchTerm });
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      gradeLevel: '',
      username: '',
      password: '',
      parentName: '',
      parentPhone: '',
      notes: '',
      isActive: true,
    },
  });

  const onSubmit = (values: z.infer<typeof studentSchema>) => {
    if (editStudentId) {
      updateStudent.mutate({ id: editStudentId, data: values }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
          setIsAddOpen(false);
          setEditStudentId(null);
          form.reset();
        }
      });
    } else {
      if (!values.password) {
        toast({ title: 'كلمة المرور مطلوبة للطالب الجديد', variant: 'destructive' });
        return;
      }
      createStudent.mutate({ data: values as any }, {
        onSuccess: () => {
          toast({ title: 'تمت الإضافة بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetStudentsQueryKey() });
          setIsAddOpen(false);
          form.reset();
        }
      });
    }
  };

  const handleEdit = (student: any) => {
    setEditStudentId(student.id);
    form.reset({
      fullName: student.fullName,
      phone: student.phone,
      gradeLevel: student.gradeLevel,
      username: student.username,
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
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
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة الطلاب</h1>
        
        <div className="flex w-full sm:w-auto gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث عن طالب..." 
              className="pr-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditStudentId(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="w-4 h-4" />
                إضافة طالب
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editStudentId ? 'تعديل طالب' : 'إضافة طالب جديد'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المستخدم</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="gradeLevel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>المرحلة الدراسية</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>كلمة المرور {editStudentId && '(اختياري)'}</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="parentName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم ولي الأمر</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="parentPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم ولي الأمر</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={createStudent.isPending || updateStudent.isPending}>
                      حفظ البيانات
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>اسم المستخدم</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>المرحلة</TableHead>
              <TableHead>ولي الأمر</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
              </TableRow>
            ) : students?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا يوجد طلاب</TableCell>
              </TableRow>
            ) : (
              students?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.fullName}</TableCell>
                  <TableCell>{student.username}</TableCell>
                  <TableCell dir="ltr" className="text-right">{student.phone}</TableCell>
                  <TableCell>{student.gradeLevel}</TableCell>
                  <TableCell>
                    {student.parentName ? (
                      <div>
                        <div>{student.parentName}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{student.parentPhone}</div>
                      </div>
                    ) : '-'}
                  </TableCell>
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
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)}>
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
