import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ThumbsUp, ThumbsDown, MessageSquare, Search, BookOpen } from 'lucide-react';

interface Reaction {
  id: number;
  reaction: 'like' | 'dislike';
  feedback: string | null;
  createdAt: string;
  lessonId: number;
  lessonTitle: string | null;
  courseTitle: string | null;
  studentId: number;
  studentName: string | null;
}

function useFeedback() {
  return useQuery<Reaction[]>({
    queryKey: ['admin-reactions'],
    queryFn: () => adminFetch('/api/admin/reactions').then(r => r.json()),
    refetchInterval: 30_000,
  });
}

export default function FeedbackPage() {
  const { data: reactions = [], isLoading } = useFeedback();
  const [filter, setFilter] = useState<'all' | 'like' | 'dislike'>('all');
  const [search, setSearch] = useState('');

  const likes = reactions.filter(r => r.reaction === 'like').length;
  const dislikes = reactions.filter(r => r.reaction === 'dislike').length;
  const withFeedback = reactions.filter(r => r.feedback).length;

  const filtered = reactions.filter(r => {
    if (filter !== 'all' && r.reaction !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.studentName ?? '').toLowerCase().includes(q) ||
        (r.lessonTitle ?? '').toLowerCase().includes(q) ||
        (r.courseTitle ?? '').toLowerCase().includes(q) ||
        (r.feedback ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback — تقييمات الطلاب</h1>
        <p className="text-muted-foreground text-sm mt-1">كل الإعجابات وعدم الإعجابات مع الأوصاف</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <ThumbsUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{likes}</p>
              <p className="text-xs text-muted-foreground">إعجاب</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <ThumbsDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{dislikes}</p>
              <p className="text-xs text-muted-foreground">لم يعجبني</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{withFeedback}</p>
              <p className="text-xs text-muted-foreground">مع وصف</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالطالب أو المحاضرة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9 text-right"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'like', 'dislike'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? 'الكل' : f === 'like' ? '👍 إعجاب' : '👎 لم يعجبني'}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">لا توجد نتائج</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className={r.reaction === 'dislike' && r.feedback ? 'border-red-200 dark:border-red-800' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    {r.reaction === 'like' ? (
                      <ThumbsUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <ThumbsDown className="w-5 h-5 text-red-500" />
                    )}
                    <Badge variant={r.reaction === 'like' ? 'default' : 'destructive'} className="text-xs">
                      {r.reaction === 'like' ? 'إعجاب' : 'لم يعجبني'}
                    </Badge>
                  </div>

                  <div className="flex-1 text-right space-y-1">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="font-semibold text-sm">{r.studentName ?? `طالب #${r.studentId}`}</span>
                      <span className="text-muted-foreground text-xs">{fmt(r.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 justify-end text-muted-foreground text-xs">
                      <span>{r.lessonTitle ?? `محاضرة #${r.lessonId}`}</span>
                      {r.courseTitle && (
                        <>
                          <span>·</span>
                          <BookOpen className="w-3 h-3" />
                          <span>{r.courseTitle}</span>
                        </>
                      )}
                    </div>

                    {r.feedback && (
                      <div className="mt-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
                        <p className="font-medium text-xs text-red-600 dark:text-red-400 mb-1">ملاحظة الطالب:</p>
                        <p>{r.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
