import React, { useState } from 'react';
import { 
  useGetAssistants, 
  useCreateAssistant, 
  useUpdateAssistant, 
  useDeleteAssistant,
  useGetTeachers,
  getGetAssistantsQueryKey
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
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const assistantSchema = z.object({
  fullName: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف مطلوب'),
  username: z.string().min(3, 'اسم المستخدم مطلوب'),
  password: z.string().optional(),
  teacherId: z.coerce.number().min(1, 'الرجاء اختيار الأستاذ'),
  isActive: z.boolean().default(true),
});

export default function AssistantsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: assistants, isLoading } = useGetAssistants(); // Add search param if API supports it, or filter locally
  const { data: teachers } = useGetTeachers();
  
  const createAssistant = useCreateAssistant();
  const updateAssistant = useUpdateAssistant();
  const deleteAssistant = useDeleteAssistant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof assistantSchema>>({
    resolver: zodResolver(assistantSchema),
    defaultValues: { fullName: '', phone: '', username: '', password: '', teacherId: 0, isActive: true },
  });

  const onSubmit = (values: z.infer<typeof assistantSchema>) => {
    if (editId) {
      updateAssistant.mutate({ id: editId, data: values }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetAssistantsQueryKey() });
          setIsAddOpen(false); setEditId(null); form.reset();
        }
      });
    } else {
      if (!values.password) {
        toast({ title: 'كلمة المرور مطلوبة', variant: 'destructive' }); return;
      }
      createAssistant.mutate({ data: values as any }, {
        onSuccess: () => {
          toast({ title: 'تمت الإضافة بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetAssistantsQueryKey() });
          setIsAddOpen(false); form.reset();
        }
      });
    }
  };

  const handleEdit = (assistant: any) => {
    setEditId(assistant.id);
    form.reset({
      fullName: assistant.fullName, phone: assistant.phone, username: assistant.username,
      teacherId: assistant.teacherId, isActive: assistant.isActive
    });
    setIsAddOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      deleteAssistant.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          queryClient.invalidateQueries({ queryKey: getGetAssistantsQueryKey() });
        }
      });
    }
  };

  const filteredAssistants = assistants?.filter(a => 
    a.fullName.includes(searchTerm) || a.username.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة المساعدين</h1>
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
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> إضافة مساعد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editId ? 'تعديل' : 'إضافة مساعد جديد'}</DialogTitle></DialogHeader>
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
                  <FormField control={form.control} name="teacherId" render={({field}) => (
                    <FormItem>
                      <FormLabel>الأستاذ المشرف</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="اختر الأستاذ" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teachers?.map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={createAssistant.isPending || updateAssistant.isPending}>حفظ</Button>
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
              <TableHead>الأستاذ المشرف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filteredAssistants?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">لا يوجد مساعدين</TableCell></TableRow>
            ) : (
              filteredAssistants?.map((assistant) => (
                <TableRow key={assistant.id}>
                  <TableCell className="font-medium">{assistant.fullName}</TableCell>
                  <TableCell>{assistant.username}</TableCell>
                  <TableCell dir="ltr" className="text-right">{assistant.phone}</TableCell>
                  <TableCell>{assistant.teacherName}</TableCell>
                  <TableCell>
                    {assistant.isActive ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1"><CheckCircle className="w-3 h-3" /> نشط</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1"><XCircle className="w-3 h-3" /> غير نشط</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(assistant)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(assistant.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
