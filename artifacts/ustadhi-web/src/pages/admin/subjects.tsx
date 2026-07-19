import React, { useState } from 'react';
import { 
  useGetSubjects, 
  useCreateSubject, 
  useUpdateSubject, 
  useDeleteSubject,
  getGetSubjectsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Edit, Trash2, BookOpen } from 'lucide-react';

const subjectSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  gradeLevel: z.string().min(1, 'المرحلة الدراسية مطلوبة'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

const gradeLevels = [
  'الصف الأول المتوسط',
  'الصف الثاني المتوسط',
  'الصف الثالث المتوسط',
  'الصف الرابع الإعدادي',
  'الصف الخامس الإعدادي',
  'الصف السادس الإعدادي',
];

export default function SubjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: subjects, isLoading } = useGetSubjects();
  
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof subjectSchema>>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: '', gradeLevel: '', description: '', icon: '' },
  });

  const onSubmit = (values: z.infer<typeof subjectSchema>) => {
    if (editId) {
      updateSubject.mutate({ id: editId, data: values }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetSubjectsQueryKey() });
          setIsAddOpen(false); setEditId(null); form.reset();
        }
      });
    } else {
      createSubject.mutate({ data: values }, {
        onSuccess: () => {
          toast({ title: 'تمت الإضافة بنجاح' });
          queryClient.invalidateQueries({ queryKey: getGetSubjectsQueryKey() });
          setIsAddOpen(false); form.reset();
        }
      });
    }
  };

  const handleEdit = (subject: any) => {
    setEditId(subject.id);
    form.reset({
      name: subject.name, gradeLevel: subject.gradeLevel, 
      description: subject.description || '', icon: subject.icon || ''
    });
    setIsAddOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من الحذف؟ سيؤثر هذا على الدورات المرتبطة.')) {
      deleteSubject.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          queryClient.invalidateQueries({ queryKey: getGetSubjectsQueryKey() });
        }
      });
    }
  };

  const filteredSubjects = subjects?.filter(s => 
    s.name.includes(searchTerm) || s.gradeLevel.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة المواد الدراسية</h1>
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
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> إضافة مادة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editId ? 'تعديل المادة' : 'إضافة مادة جديدة'}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({field}) => (
                    <FormItem><FormLabel>اسم المادة</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="gradeLevel" render={({field}) => (
                    <FormItem>
                      <FormLabel>المرحلة الدراسية</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {gradeLevels.map(lvl => (
                            <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({field}) => (
                    <FormItem><FormLabel>وصف المادة</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={createSubject.isPending || updateSubject.isPending}>حفظ</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : filteredSubjects?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">لا يوجد مواد دراسية</div>
        ) : (
          filteredSubjects?.map((subject) => (
            <div key={subject.id} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => handleEdit(subject)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => handleDelete(subject.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">{subject.name}</h3>
              <p className="text-muted-foreground text-sm mt-1">{subject.gradeLevel}</p>
              {subject.description && <p className="text-sm mt-4 text-foreground/80 line-clamp-2">{subject.description}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
