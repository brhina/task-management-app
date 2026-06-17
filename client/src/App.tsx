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
import CreateTask from './pages/admin/CreateTask';
import ManageTasks from './pages/admin/ManageTasks';
import ManageUsers from './pages/admin/ManageUsers';
import Reports from './pages/admin/Reports';
import Projects from './pages/admin/Projects';
import CreateProject from './pages/admin/CreateProject';
import Goals from './pages/admin/Goals';
import CreateGoal from './pages/admin/CreateGoal';
import GoalDetails from './pages/admin/GoalDetails';
import WorkOS from './pages/admin/WorkOS';

import UserDashboard from './pages/user/UserDashboard';
import UserWorkOS from './pages/user/UserWorkOS';
import MyTasks from './pages/user/MyTasks';
import ViewTaskDetails from './pages/user/ViewTaskDetails';
import ProfileUpdate from './pages/user/ProfileUpdate';

import AuthLayout from './components/layouts/AuthLayout';
import UserProvider from './context/UserContext';
import type { User } from './types';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const PrivateRoute = ({ children, allowedRoles = [] }: PrivateRouteProps) => {
  const { user, loading, getEffectiveRole } = useContext(UserContext);
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
    const redirectTo = effectiveRole === 'OrgAdmin' ? '/admin/dashboard' : '/user/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

interface RouteWrapperProps {
  children: React.ReactNode;
}

const AdminRouteWrapper = ({ children }: RouteWrapperProps) => {
  return <PrivateRoute allowedRoles={['OrgAdmin']}>{children}</PrivateRoute>;
};

const UserRouteWrapper = ({ children }: RouteWrapperProps) => {
  return <PrivateRoute allowedRoles={['OrgAdmin', 'OrgMember']}>{children}</PrivateRoute>;
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
  const { getEffectiveRole } = useContext(UserContext);
  const effectiveRole = getEffectiveRole();
  if (user) {
    return (
      <Navigate
        to={effectiveRole === 'OrgAdmin' ? '/admin/dashboard' : '/user/dashboard'}
        replace
      />
    );
  }
  return <Login />;
}, userEqual);

const SignUpRoute = React.memo(({ user }: RouteComponentProps) => {
  const { getEffectiveRole } = useContext(UserContext);
  const effectiveRole = getEffectiveRole();
  if (user) {
    return (
      <Navigate
        to={effectiveRole === 'OrgAdmin' ? '/admin/dashboard' : '/user/dashboard'}
        replace
      />
    );
  }
  return <SignUp />;
}, userEqual);

const HomeRoute = React.memo(({ user }: RouteComponentProps) => {
  const { getEffectiveRole } = useContext(UserContext);
  const effectiveRole = getEffectiveRole();
  if (user) {
    return effectiveRole === 'OrgAdmin' ? (
      <Navigate to="/admin/dashboard" replace />
    ) : (
      <Navigate to="/user/dashboard" replace />
    );
  }
  return <Landing />;
}, userEqual);

const AdminRedirectRoute = React.memo(({ user }: RouteComponentProps) => {
  const { getEffectiveRole } = useContext(UserContext);
  const effectiveRole = getEffectiveRole();
  if (user && effectiveRole === 'OrgAdmin') {
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
  const { getEffectiveRole } = useContext(UserContext);
  const effectiveRole = getEffectiveRole();
  if (user) {
    return effectiveRole === 'OrgAdmin' ? (
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
          path="/admin/create-task"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <CreateTask />
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
          path="/admin/projects/create"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <CreateProject />
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
          path="/admin/goals/create"
          element={
            <AdminRouteWrapper>
              <AuthLayout>
                <CreateGoal />
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

        <Route path="/admin" element={<AdminRedirectRoute user={user} />} />
        <Route path="/user" element={<UserRedirectRoute user={user} />} />

        <Route path="*" element={<CatchAllRoute user={user} />} />
      </Routes>
    </Router>
  );
}

function AppWithProvider() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <App />
      </UserProvider>
    </ErrorBoundary>
  );
}

export default AppWithProvider;
