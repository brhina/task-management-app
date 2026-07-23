import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { ROLES } from './constants/roles';

import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import Landing from './pages/public/Landing';

import Dashboard from './pages/admin/Dashboard';
import EditTask from './pages/admin/EditTask';
import ManageTasks from './pages/admin/ManageTasks';
import ManageUsers from './pages/admin/ManageUsers';
import Reports from './pages/admin/Reports';
import Projects from './pages/admin/Projects';
import EditProject from './pages/admin/EditProject';
import Goals from './pages/admin/Goals';
import EditGoal from './pages/admin/EditGoal';
import GoalDetails from './pages/admin/GoalDetails';
import WorkOS from './pages/admin/WorkOS';
import TaskTemplates from './pages/admin/TaskTemplates';
import CustomFields from './pages/admin/CustomFields';
import ProjectGantt from './pages/admin/ProjectGantt';
import ProjectSprints from './pages/admin/ProjectSprints';
import SprintBoard from './pages/admin/SprintBoard';
import Resources from './pages/admin/Resources';
import RolesPermissions from './pages/admin/RolesPermissions';
import Teams from './pages/admin/Teams';
import AuditLog from './pages/admin/AuditLog';
import UserDashboard from './pages/user/UserDashboard';
import UserWorkOS from './pages/user/UserWorkOS';
import MyTasks from './pages/user/MyTasks';
import ViewTaskDetails from './pages/user/ViewTaskDetails';
import ProfileUpdate from './pages/user/ProfileUpdate';
import NotFound from './pages/public/NotFound';

import AuthLayout from './components/layouts/AuthLayout';
import UserProvider from './context/UserContext';
import { SocketProvider } from './context/SocketContext';
import type { User } from './types';
import NotificationSettings from './pages/user/NotificationSettings';
import { ADMIN_SUITE_ROLES, SYSTEM_ROLES } from './constants/permissions';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const PrivateRoute = ({ children, allowedRoles = [] }: PrivateRouteProps) => {
  const { user, loading, getEffectiveRole, canAccessAdminSuite } = useContext(UserContext);
  const location = useLocation();
  const effectiveRole = getEffectiveRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && (!effectiveRole || !allowedRoles.includes(effectiveRole))) {
    // Custom roles with admin-suite permissions can still enter admin routes
    const adminGate = allowedRoles.some((r) => ADMIN_SUITE_ROLES.includes(r as any));
    if (!(adminGate && canAccessAdminSuite())) {
      const redirectTo = canAccessAdminSuite() ? '/admin/dashboard' : '/user/dashboard';
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

interface RouteWrapperProps {
  children: React.ReactNode;
}

const AdminRouteWrapper = ({ children }: RouteWrapperProps) => {
  return (
    <PrivateRoute allowedRoles={[...ADMIN_SUITE_ROLES, 'Custom']}>{children}</PrivateRoute>
  );
};

const UserRouteWrapper = ({ children }: RouteWrapperProps) => {
  return (
    <PrivateRoute allowedRoles={[...SYSTEM_ROLES, 'Custom']}>{children}</PrivateRoute>
  );
};

const userEqual = (prevProps: { user: User | null }, nextProps: { user: User | null }) => {
  const prevUser = prevProps.user;
  const nextUser = nextProps.user;

  if (!prevUser && !nextUser) return true;
  if (!prevUser || !nextUser) return false;
  return (
    prevUser._id === nextUser._id &&
    prevUser.role === nextUser.role &&
    prevUser.email === nextUser.email
  );
};

interface RouteComponentProps {
  user: User | null;
}

const LoginRoute = React.memo(({ user }: RouteComponentProps) => {
  const { canAccessAdminSuite } = useContext(UserContext);
  if (user) {
    return (
      <Navigate
        to={canAccessAdminSuite() ? '/admin/dashboard' : '/user/dashboard'}
        replace
      />
    );
  }
  return <Login />;
}, userEqual);

const SignUpRoute = React.memo(({ user }: RouteComponentProps) => {
  const { canAccessAdminSuite } = useContext(UserContext);
  if (user) {
    return (
      <Navigate
        to={canAccessAdminSuite() ? '/admin/dashboard' : '/user/dashboard'}
        replace
      />
    );
  }
  return <SignUp />;
}, userEqual);

const HomeRoute = React.memo(({ user }: RouteComponentProps) => {
  const { canAccessAdminSuite } = useContext(UserContext);
  if (user) {
    return canAccessAdminSuite() ? (
      <Navigate to="/admin/dashboard" replace />
    ) : (
      <Navigate to="/user/dashboard" replace />
    );
  }
  return <Landing />;
}, userEqual);

const AdminRedirectRoute = React.memo(({ user }: RouteComponentProps) => {
  const { canAccessAdminSuite } = useContext(UserContext);
  if (user && canAccessAdminSuite()) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}, userEqual);

const UserRedirectRoute = React.memo(({ user }: RouteComponentProps) => {
  if (user) {
    return <Navigate to="/user/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}, userEqual);

const CatchAllRoute = React.memo(({ user }: RouteComponentProps) => {
  const { canAccessAdminSuite } = useContext(UserContext);
  if (user) {
    return canAccessAdminSuite() ? (
      <Navigate to="/admin/dashboard" replace />
    ) : (
      <Navigate to="/user/dashboard" replace />
    );
  }
  return <Navigate to="/login" replace />;
}, userEqual);

function App() {
  const { user } = useContext(UserContext);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeRoute user={user} />} />
        <Route path="/login" element={<LoginRoute user={user} />} />
        <Route path="/signup" element={<SignUpRoute user={user} />} />

        <Route
          path="/admin/dashboard"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Dashboard />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/edit-task/:id"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <EditTask />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/manage-tasks"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ManageTasks />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/task/:id"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ViewTaskDetails />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/manage-users"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ManageUsers />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Reports />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Projects />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/projects/edit/:id"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <EditProject />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/goals"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Goals />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/goals/edit/:id"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <EditGoal />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/goals/:id"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <GoalDetails />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/workos"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <WorkOS />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/task-templates"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <TaskTemplates />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/custom-fields"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <CustomFields />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/resources"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Resources />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/projects/:id/gantt"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ProjectGantt />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/projects/:id/sprints"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ProjectSprints />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/sprints/:id/board"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <SprintBoard />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/teams"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Teams />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <RolesPermissions />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <AuditLog />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />

        <Route
          path="/user/dashboard"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <UserDashboard />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/user/workos"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <UserWorkOS />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/user/my-tasks"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <MyTasks />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/user/task/:id"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <ViewTaskDetails />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/user/profile"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <ProfileUpdate />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/user/notification-settings"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <NotificationSettings />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/admin/notification-settings"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <NotificationSettings />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />

        <Route path="/admin" element={<AdminRedirectRoute user={user} />} />
        <Route path="/user" element={<UserRedirectRoute user={user} />} />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function AppWithProvider() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}

export default AppWithProvider;
