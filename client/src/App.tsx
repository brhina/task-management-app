import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';

import Login from './pages/auth/Login';
// Signup disabled — self-service registration is turned off.
// import SignUp from './pages/auth/SignUp';
import Landing from './pages/public/Landing';
import NotFound from './pages/public/NotFound';

import Dashboard from './pages/dashboard/Dashboard';

import ManageTasks from './pages/tasks/ManageTasks';
import EditTask from './pages/tasks/EditTask';
import ViewTaskDetails from './pages/tasks/ViewTaskDetails';
import TaskTemplates from './pages/tasks/TaskTemplates';

import Projects from './pages/projects/Projects';
import EditProject from './pages/projects/EditProject';
import ProjectGantt from './pages/projects/ProjectGantt';
import ProjectSprints from './pages/projects/ProjectSprints';
import SprintBoard from './pages/projects/SprintBoard';

import Goals from './pages/goals/Goals';
import EditGoal from './pages/goals/EditGoal';
import GoalDetails from './pages/goals/GoalDetails';

import ManageUsers from './pages/users/ManageUsers';
import ProfileUpdate from './pages/users/ProfileUpdate';
import MemberPerformanceDashboard from './pages/users/MemberPerformanceDashboard';

import WorkOS from './pages/settings/WorkOS';
import RolesPermissions from './pages/settings/RolesPermissions';
import NotificationSettings from './pages/settings/NotificationSettings';
// Enterprise Center disabled
// import EnterpriseSettings from './pages/settings/EnterpriseSettings';

import Reports from './pages/reports/Reports';
import Teams from './pages/teams/Teams';
import TeamPerformanceDashboard from './pages/teams/TeamPerformanceDashboard';

import AuthLayout from './components/layouts/AuthLayout';
import UserProvider from './context/UserContext';
import { SocketProvider } from './context/SocketContext';
import type { User } from './types';
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
    const adminGate = allowedRoles.some((r) => ADMIN_SUITE_ROLES.includes(r as any));
    if (!(adminGate && canAccessAdminSuite())) {
      return <Navigate to="/dashboard" replace />;
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
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Login />;
}, userEqual);

const SignUpRoute = React.memo(({ user }: RouteComponentProps) => {
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <SignUp />;
}, userEqual);

const HomeRoute = React.memo(({ user }: RouteComponentProps) => {
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
}, userEqual);

const CatchAllRoute = React.memo(({ user }: RouteComponentProps) => {
  if (user) {
    return <Navigate to="/dashboard" replace />;
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
        {/* Signup disabled — self-service registration is turned off.
        <Route path="/signup" element={<SignUpRoute user={user} />} />
        */}

        {/* Dashboard - accessible by all authenticated users */}
        <Route
          path="/dashboard"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <Dashboard />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />

        {/* Tasks */}
        <Route
          path="/tasks"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <ManageTasks />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/tasks/create"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ManageTasks />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/tasks/:id"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <ViewTaskDetails />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/tasks/:id/edit"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <EditTask />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/tasks/templates"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <TaskTemplates />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />

        {/* Projects */}
        <Route
          path="/projects"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <Projects />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/projects/:id/edit"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <EditProject />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/projects/:id/gantt"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ProjectGantt />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/projects/:id/sprints"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ProjectSprints />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/sprints/:id/board"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <SprintBoard />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />

        {/* Goals */}
        <Route
          path="/goals"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Goals />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/goals/create"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Goals />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/goals/:id"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <GoalDetails />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/goals/:id/edit"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <EditGoal />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />

        {/* Users */}
        <Route
          path="/users"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <ManageUsers />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route
          path="/users/profile"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <ProfileUpdate />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/users/performance"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <MemberPerformanceDashboard />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/users/:id/performance"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <MemberPerformanceDashboard />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <UserRouteWrapper>
              <Navigate to="/settings/workos" replace />
            </UserRouteWrapper>
          }
        />
        <Route
          path="/settings/workos"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <WorkOS />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/settings/roles"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <RolesPermissions />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />

        <Route
          path="/settings/notifications"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <NotificationSettings />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        {/* Enterprise Center disabled
        <Route
          path="/settings/enterprise"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <EnterpriseSettings />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        */}

        {/* Other admin pages */}
        <Route
          path="/teams"
          element={<Navigate to="/users?tab=teams" replace />}
        />
        <Route
          path="/teams/performance"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <TeamPerformanceDashboard />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/teams/:id/performance"
          element={
            <UserRouteWrapper>
              <AuthLayout>
                <TeamPerformanceDashboard />
              </AuthLayout>
            </UserRouteWrapper>
          }
        />
        <Route
          path="/reports"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <Reports />
              </AuthLayout>
            </AdminRouteWrapper>
          }
        />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<CatchAllRoute user={user} />} />
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
