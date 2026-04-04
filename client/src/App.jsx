import React, { useContext, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { ROLES } from './constants/roles';
import { trackPageView } from './utils/analytics';

// Auth pages
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import Landing from './pages/public/Landing';

// Admin pages
import Dashboard from './pages/admin/Dashboard';
import CreateTask from './pages/admin/CreateTask';
import ManageTasks from './pages/admin/ManageTasks';
import ManageUsers from './pages/admin/ManageUsers';
import Reports from './pages/admin/Reports';

// User pages
import UserDashboard from './pages/user/UserDashboard';
import MyTasks from './pages/user/MyTasks';
import ViewTaskDetails from './pages/user/ViewTaskDetails';
import ProfileUpdate from './pages/user/ProfileUpdate';

// Layouts
import AuthLayout from './components/layouts/AuthLayout';
import UserProvider from './context/UserContext';

// Private Route Component
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useContext(UserContext);
  const location = useLocation();

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

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role instead of "/" to avoid loops
    const redirectTo = user.role === ROLES.ADMIN ? '/admin/dashboard' : '/user/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

// Admin Route Component
const AdminRouteWrapper = ({ children }) => {
  return <PrivateRoute allowedRoles={[ROLES.ADMIN]}>{children}</PrivateRoute>;
};

// User Route Component
const UserRouteWrapper = ({ children }) => {
  return <PrivateRoute allowedRoles={[ROLES.ADMIN, ROLES.MEMBER]}>{children}</PrivateRoute>;
};

// Custom comparison function for user objects
const userEqual = (prevProps, nextProps) => {
  const prevUser = prevProps.user;
  const nextUser = nextProps.user;
  
  // Both null/undefined - equal
  if (!prevUser && !nextUser) return true;
  // One is null, other is not - not equal
  if (!prevUser || !nextUser) return false;
  // Compare key fields
  return prevUser._id === nextUser._id && 
         prevUser.role === nextUser.role &&
         prevUser.email === nextUser.email;
};

// Route components to prevent re-creation on every render
const LoginRoute = React.memo(({ user }) => {
  if (user) {
    return <Navigate to={user.role === ROLES.ADMIN ? '/admin/dashboard' : '/user/dashboard'} replace />;
  }
  return <Login />;
}, userEqual);

const SignUpRoute = React.memo(({ user }) => {
  if (user) {
    return <Navigate to={user.role === ROLES.ADMIN ? '/admin/dashboard' : '/user/dashboard'} replace />;
  }
  return <SignUp />;
}, userEqual);

const HomeRoute = React.memo(({ user }) => {
  if (user) {
    return user.role === ROLES.ADMIN ? 
      <Navigate to="/admin/dashboard" replace /> : 
      <Navigate to="/user/dashboard" replace />;
  }
  return <Landing />;
}, userEqual);

const AdminRedirectRoute = React.memo(({ user }) => {
  if (user && user.role === ROLES.ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}, userEqual);

const UserRedirectRoute = React.memo(({ user }) => {
  if (user) {
    return <Navigate to="/user/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}, userEqual);

const CatchAllRoute = React.memo(({ user }) => {
  if (user) {
    return user.role === ROLES.ADMIN ? 
      <Navigate to="/admin/dashboard" replace /> : 
      <Navigate to="/user/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}, userEqual);

const AnalyticsTracker = () => {
  const location = useLocation();
  const lastTrackedPathRef = useRef('');

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}${location.hash}`;

    if (lastTrackedPathRef.current === pagePath) {
      return;
    }

    lastTrackedPathRef.current = pagePath;
    trackPageView(pagePath);
  }, [location.hash, location.pathname, location.search]);

  return null;
};

function App() {
  const { user } = useContext(UserContext);

  return (
    <Router>
      <AnalyticsTracker />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomeRoute user={user} />} />
        <Route path="/login" element={<LoginRoute user={user} />} />
        <Route path="/signup" element={<SignUpRoute user={user} />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <AdminRouteWrapper>
            <AuthLayout>
              <Dashboard />
            </AuthLayout>
          </AdminRouteWrapper>
        } />
        <Route path="/admin/create-task" element={
          <AdminRouteWrapper>
            <AuthLayout>
              <CreateTask />
            </AuthLayout>
          </AdminRouteWrapper>
        } />
        <Route path="/admin/manage-tasks" element={
          <AdminRouteWrapper>
            <AuthLayout>
              <ManageTasks />
            </AuthLayout>
          </AdminRouteWrapper>
        } />
        <Route path="/admin/manage-users" element={
          <AdminRouteWrapper>
            <AuthLayout>
              <ManageUsers />
            </AuthLayout>
          </AdminRouteWrapper>
        } />
        <Route path="/admin/reports" element={
          <AdminRouteWrapper>
            <AuthLayout>
              <Reports />
            </AuthLayout>
          </AdminRouteWrapper>
        } />

        {/* User Routes */}
        <Route path="/user/dashboard" element={
          <UserRouteWrapper>
            <AuthLayout>
              <UserDashboard />
            </AuthLayout>
          </UserRouteWrapper>
        } />
        <Route path="/user/my-tasks" element={
          <UserRouteWrapper>
            <AuthLayout>
              <MyTasks />
            </AuthLayout>
          </UserRouteWrapper>
        } />
        <Route path="/user/task/:id" element={
          <UserRouteWrapper>
            <AuthLayout>
              <ViewTaskDetails />
            </AuthLayout>
          </UserRouteWrapper>
        } />
        <Route path="/user/profile" element={
          <UserRouteWrapper>
            <AuthLayout>
              <ProfileUpdate />
            </AuthLayout>
          </UserRouteWrapper>
        } />

        {/* Default redirects */}
        <Route path="/admin" element={<AdminRedirectRoute user={user} />} />
        <Route path="/user" element={<UserRedirectRoute user={user} />} />

        {/* Catch all route */}
        <Route path="*" element={<CatchAllRoute user={user} />} />
      </Routes>
    </Router>
  );
}

// Wrap the App with UserProvider and ErrorBoundary
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
