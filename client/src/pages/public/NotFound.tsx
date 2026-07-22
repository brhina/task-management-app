import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Home, LayoutDashboard } from 'lucide-react';
import { UserContext } from '../../context/UserContext';

function NotFound() {
  const { user, getEffectiveRole } = useContext(UserContext);
  const effectiveRole = getEffectiveRole();

  const dashboardPath =
    user && effectiveRole === 'OrgAdmin' ? '/admin/dashboard' : '/user/dashboard';

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-slate-200 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-300 mb-3">Page not found</h2>
        <p className="text-slate-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to={dashboardPath} className="btn-primary inline-flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link to="/" className="btn-secondary inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
