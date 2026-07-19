import React, { useState } from 'react';
import { 
  useGetReviews, 
  useCreateReview, 
  useUpdateReview, 
  useDeleteReview,
  getGetReviewsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Star, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const reviewSchema = z.object({
  studentName: z.string().min(2, 'الاسم مطلوب'),
  studentPhone: z.string().optional(),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().min(2, 'التعليق مطلوب'),
  isPublished: z.boolean().default(true),
});

export default function ReviewsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: reviews, isLoading } = useGetReviews();
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { studentName: '', studentPhone: '', rating: 5, comment: '', isPublished: true },
  });

  const onSubmit = (values: z.infer<typeof reviewSchema>) => {
    createReview.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: 'تمت الإضافة بنجاح' });
        queryClient.invalidateQueries({ queryKey: getGetReviewsQueryKey() });
        setIsAddOpen(false); form.reset();
      }
    });
  };

  const handleTogglePublish = (id: number, currentStatus: boolean) => {
    updateReview.mutate({ id, data: { isPublished: !currentStatus } }, {
      onSuccess: () => {
        queryClient.setQueryData(getGetReviewsQueryKey(), (old: any) => {
          if (!old) return old;
          return old.map((r: any) => r.id === id ? { ...r, isPublished: !currentStatus } : r);
        });
        toast({ title: !currentStatus ? 'تم النشر' : 'تم إخفاء التقييم' });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      deleteReview.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          queryClient.invalidateQueries({ queryKey: getGetReviewsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">إدارة التقييمات</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> إضافة تقييم يدوي</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>إضافة تقييم طالب</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="studentName" render={({field}) => (
                  <FormItem><FormLabel>اسم الطالب</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="studentPhone" render={({field}) => (
                    <FormItem><FormLabel>رقم الهاتف (اختياري)</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="rating" render={({field}) => (
                    <FormItem><FormLabel>التقييم (1-5)</FormLabel><FormControl><Input type="number" min="1" max="5" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="comment" render={({field}) => (
                  <FormItem><FormLabel>نص التقييم</FormLabel><FormControl><Textarea className="h-24" {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="isPublished" render={({field}) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 pt-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel>نشر التقييم مباشرة</FormLabel>
                  </FormItem>
                )} />
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={createReview.isPending}>حفظ التقييم</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : reviews?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">لا توجد تقييمات</div>
        ) : (
          reviews?.map((review) => (
            <Card key={review.id} className={!review.isPublished ? 'opacity-70 bg-muted/30' : ''}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-1 text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1">
                      <span className="text-xs text-muted-foreground select-none">منشور</span>
                      <Switch 
                        checked={review.isPublished} 
                        onCheckedChange={() => handleTogglePublish(review.id, review.isPublished)} 
                        disabled={updateReview.isPending}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(review.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-foreground leading-relaxed font-medium mb-6">"{review.comment}"</p>
                
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {review.studentName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{review.studentName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
