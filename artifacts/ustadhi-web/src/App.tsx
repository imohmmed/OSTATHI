import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

import { AdminLayout } from '@/components/layout/admin-layout';
import AdminLogin from '@/pages/admin/login';
import AdminDashboard from '@/pages/admin/dashboard';
import StudentsPage from '@/pages/admin/students';
import TeachersPage from '@/pages/admin/teachers';
import AssistantsPage from '@/pages/admin/assistants';
import ParentsPage from '@/pages/admin/parents';
import SubjectsPage from '@/pages/admin/subjects';
import CoursesPage from '@/pages/admin/courses';
import CourseDetailPage from '@/pages/admin/course-detail';
import ReviewsPage from '@/pages/admin/reviews';
import LivestreamsPage from '@/pages/admin/livestreams';
import NotificationsPage from '@/pages/admin/notifications';
import LandingPage from '@/pages/landing';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Switch>
              <Route path="/" component={LandingPage} />
              <Route path="/admin/login" component={AdminLogin} />
              
              <Route path="/admin*">
                <AdminLayout>
                  <Switch>
                    <Route path="/admin" component={AdminDashboard} />
                    <Route path="/admin/students" component={StudentsPage} />
                    <Route path="/admin/teachers" component={TeachersPage} />
                    <Route path="/admin/assistants" component={AssistantsPage} />
                    <Route path="/admin/parents" component={ParentsPage} />
                    <Route path="/admin/subjects" component={SubjectsPage} />
                    <Route path="/admin/courses" component={CoursesPage} />
                    <Route path="/admin/courses/:id" component={CourseDetailPage} />
                    <Route path="/admin/reviews" component={ReviewsPage} />
                    <Route path="/admin/livestreams" component={LivestreamsPage} />
                    <Route path="/admin/notifications" component={NotificationsPage} />
                    <Route component={NotFound} />
                  </Switch>
                </AdminLayout>
              </Route>
              
              <Route component={NotFound} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
