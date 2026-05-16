import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Layout } from "@/components/layout";

import Landing from "@/pages/landing";
import StudentSignin from "@/pages/student-signin";
import StudentSignup from "@/pages/student-signup";
import TeacherSignin from "@/pages/teacher-signin";
import NotFound from "@/pages/not-found";
import SettingsPage from "@/pages/settings";
import NotificationsPage from "@/pages/notifications";

import TeacherFiles from "@/pages/teacher/files";
import TeacherStudents from "@/pages/teacher/students";
import TeacherRatings from "@/pages/teacher/ratings";
import TeacherHomework from "@/pages/teacher/homework";

import StudentDashboard from "@/pages/student/dashboard";
import StudentReviews from "@/pages/student/reviews";
import StudentHomework from "@/pages/student/homework";
import SubjectWorkspace from "@/pages/student/subject-workspace";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, role, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user || user.role !== role) {
    return <Redirect to="/" />;
  }

  return (
    <Layout role={role}>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/" component={Landing} />
      <Route path="/student/signin" component={StudentSignin} />
      <Route path="/student/signup" component={StudentSignup} />
      <Route path="/teacher/signin" component={TeacherSignin} />

      {/* Teacher routes */}
      <Route path="/teacher">
        {() => <Redirect to="/teacher/files" />}
      </Route>
      <Route path="/teacher/files">
        {() => <ProtectedRoute component={TeacherFiles} role="teacher" />}
      </Route>
      <Route path="/teacher/students">
        {() => <ProtectedRoute component={TeacherStudents} role="teacher" />}
      </Route>
      <Route path="/teacher/homework">
        {() => <ProtectedRoute component={TeacherHomework} role="teacher" />}
      </Route>
      <Route path="/teacher/ratings">
        {() => <ProtectedRoute component={TeacherRatings} role="teacher" />}
      </Route>
      <Route path="/teacher/notifications">
        {() => <ProtectedRoute component={NotificationsPage} role="teacher" />}
      </Route>
      <Route path="/teacher/settings">
        {() => <ProtectedRoute component={SettingsPage} role="teacher" />}
      </Route>

      {/* Student routes */}
      <Route path="/student">
        {() => <ProtectedRoute component={StudentDashboard} role="student" />}
      </Route>
      <Route path="/student/homework">
        {() => <ProtectedRoute component={StudentHomework} role="student" />}
      </Route>
      <Route path="/student/reviews">
        {() => <ProtectedRoute component={StudentReviews} role="student" />}
      </Route>
      <Route path="/student/notifications">
        {() => <ProtectedRoute component={NotificationsPage} role="student" />}
      </Route>
      <Route path="/student/settings">
        {() => <ProtectedRoute component={SettingsPage} role="student" />}
      </Route>
      <Route path="/student/subjects/:subject">
        {() => <ProtectedRoute component={SubjectWorkspace} role="student" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
