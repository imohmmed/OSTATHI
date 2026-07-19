import React, { useState } from 'react';
import { 
  useGetTeachers, 
  useCreateTeacher, 
  useUpdateTeacher, 
  useDeleteTeacher,
  useGetSubjects,
  getGetTeachersQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const teacherSchema = z.object({
  fullName: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف مطلوب'),
  username: z.string().min(3, 'اسم المستخدم مطلوب'),
  password: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  subjectIds: z.array(z.number()).default([]),
});

export default function TeachersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: teachers, isLoading } = useGetTeachers({ search: searchTerm });
  const { data: subjects } = useGetSubjects();
  
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof teacherSchema>>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      fullName: '', phone: '', username: '', password: '', bio: '', avatarUrl: '', isActive: true, subjectIds: []
    },
  });

  const onSubmit = (values: z.infer<typeof teacherSchema>) => {
    if (editId) {
      updateTeacher.mutate({ id: editId, data: values }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetTeachersQueryKey() });
          setIsAddOpen(false); setEditId(null); form.reset();
        }
      });
    } else {
      if (!values.password) {
        toast({ title: 'كلمة المرور مطلوبة', variant: 'destructive' }); return;
      }
      createTeacher.mutate({ data: values as any }, {
        onSuccess: () => {
          toast({ title: 'تمت الإضافة بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetTeachersQueryKey() });
          setIsAddOpen(false); form.reset();
        }
      });
    }
  };

  const handleEdit = (teacher: any) => {
    setEditId(teacher.id);
    form.reset({
      fullName: teacher.fullName, phone: teacher.phone, username: teacher.username,
      bio: teacher.bio || '', avatarUrl: teacher.avatarUrl || '', isActive: teacher.isActive,
      subjectIds: teacher.subjectIds || []
    });
    setIsAddOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      deleteTeacher.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          queryClient.invalidateQueries({ queryKey: getGetTeachersQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة الأساتذة</h1>
        <div className="flex w-full sm:w-auto gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث..." className="pr-9"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open); if (!open) { setEditId(null); form.reset(); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> إضافة أستاذ</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? 'تعديل' : 'إضافة أستاذ جديد'}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fullName" render={({field}) => (
                      <FormItem><FormLabel>الاسم</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="username" render={({field}) => (
                      <FormItem><FormLabel>اسم المستخدم</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({field}) => (
                      <FormItem><FormLabel>رقم الهاتف</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({field}) => (
                      <FormItem><FormLabel>كلمة المرور {editId && '(اختياري)'}</FormLabel><FormControl><Input type="password" {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="bio" render={({field}) => (
                    <FormItem><FormLabel>نبذة تعريفية</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="subjectIds" render={() => (
                    <FormItem>
                      <FormLabel>المواد الدراسية</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-md">
                        {subjects?.map((sub) => (
                          <FormField key={sub.id} control={form.control} name="subjectIds" render={({ field }) => {
                            return (
                              <FormItem key={sub.id} className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
                                <FormControl>
                                  <Checkbox 
                                    checked={field.value?.includes(sub.id)}
                                    onCheckedChange={(checked) => {
                                      return checked 
                                        ? field.onChange([...field.value, sub.id])
                                        : field.onChange(field.value?.filter((value) => value !== sub.id))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{sub.name}</FormLabel>
                              </FormItem>
                            )
                          }} />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={createTeacher.isPending || updateTeacher.isPending}>حفظ</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>اسم المستخدم</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : teachers?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">لا يوجد أساتذة</TableCell></TableRow>
            ) : (
              teachers?.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.fullName}</TableCell>
                  <TableCell>{teacher.username}</TableCell>
                  <TableCell dir="ltr" className="text-right">{teacher.phone}</TableCell>
                  <TableCell>
                    {teacher.isActive ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1"><CheckCircle className="w-3 h-3" /> نشط</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1"><XCircle className="w-3 h-3" /> غير نشط</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(teacher)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(teacher.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
