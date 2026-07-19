import React, { useState } from 'react';
import { 
  useGetParents, 
  useCreateParent, 
  useUpdateParent, 
  useDeleteParent,
  useGetStudents,
  getGetParentsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';

const parentSchema = z.object({
  fullName: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف مطلوب'),
  username: z.string().min(3, 'اسم المستخدم مطلوب'),
  password: z.string().optional(),
  studentId: z.coerce.number().min(1, 'الرجاء اختيار الطالب'),
});

export default function ParentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: parents, isLoading } = useGetParents();
  const { data: students } = useGetStudents();
  
  const createParent = useCreateParent();
  const updateParent = useUpdateParent();
  const deleteParent = useDeleteParent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof parentSchema>>({
    resolver: zodResolver(parentSchema),
    defaultValues: { fullName: '', phone: '', username: '', password: '', studentId: 0 },
  });

  const onSubmit = (values: z.infer<typeof parentSchema>) => {
    if (editId) {
      updateParent.mutate({ id: editId, data: values }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetParentsQueryKey() });
          setIsAddOpen(false); setEditId(null); form.reset();
        }
      });
    } else {
      if (!values.password) {
        toast({ title: 'كلمة المرور مطلوبة', variant: 'destructive' }); return;
      }
      createParent.mutate({ data: values as any }, {
        onSuccess: () => {
          toast({ title: 'تمت الإضافة بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetParentsQueryKey() });
          setIsAddOpen(false); form.reset();
        }
      });
    }
  };

  const handleEdit = (parent: any) => {
    setEditId(parent.id);
    form.reset({
      fullName: parent.fullName, phone: parent.phone, username: parent.username,
      studentId: parent.studentId
    });
    setIsAddOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      deleteParent.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          queryClient.invalidateQueries({ queryKey: getGetParentsQueryKey() });
        }
      });
    }
  };

  const filteredParents = parents?.filter(p => 
    p.fullName.includes(searchTerm) || p.username.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة أولياء الأمور</h1>
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
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> إضافة ولي أمر</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editId ? 'تعديل' : 'إضافة ولي أمر جديد'}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormField control={form.control} name="studentId" render={({field}) => (
                    <FormItem>
                      <FormLabel>الطالب</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students?.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={createParent.isPending || updateParent.isPending}>حفظ</Button>
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
              <TableHead>الطالب المرتبط</TableHead>
              <TableHead>تاريخ الإضافة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filteredParents?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">لا يوجد أولياء أمور</TableCell></TableRow>
            ) : (
              filteredParents?.map((parent) => (
                <TableRow key={parent.id}>
                  <TableCell className="font-medium">{parent.fullName}</TableCell>
                  <TableCell>{parent.username}</TableCell>
                  <TableCell dir="ltr" className="text-right">{parent.phone}</TableCell>
                  <TableCell>{parent.studentName}</TableCell>
                  <TableCell>{new Date(parent.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(parent)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(parent.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
