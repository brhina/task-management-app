import { useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import OrgSwitcher from '../common/OrgSwitcher';
import {
  LayoutDashboard,
  ClipboardCheck,
  Plus,
  Users,
  BarChart3,
  Folder,
  Target,
  Settings,
  ChevronsLeft,
  Menu,
  ClipboardList,
  Brain,
} from 'lucide-react';

const NavIcons: Record<string, ReactNode> = {
  dashboard: <LayoutDashboard className="w-5 h-5" />,
  tasks: <ClipboardCheck className="w-5 h-5" />,
  create: <Plus className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  reports: <BarChart3 className="w-5 h-5" />,
  projects: <Folder className="w-5 h-5" />,
  goals: <Target className="w-5 h-5" />,
  workos: <Settings className="w-5 h-5" />,
  intelligence: <Brain className="w-5 h-5" />,
};

interface NavLink {
  name: string;
  path: string;
  icon: ReactNode;
}

function AuthLayout({ children }: { children: ReactNode }) {
  const { user, getEffectiveRole } = useContext(UserContext);
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const effectiveRole = getEffectiveRole();

  const isActive = useCallback(
    (path: string) => {
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  const getNavLinks: NavLink[] = useMemo(() => {
    if (!user || !effectiveRole) return [];

    if (effectiveRole === 'OrgAdmin') {
      return [
        { name: 'Dashboard', path: '/admin/dashboard', icon: NavIcons.dashboard },
        { name: 'WorkOS', path: '/admin/workos', icon: NavIcons.workos },
        { name: 'Intelligence', path: '/admin/intelligence', icon: NavIcons.intelligence },
        { name: 'Projects', path: '/admin/projects', icon: NavIcons.projects },
        { name: 'Goals', path: '/admin/goals', icon: NavIcons.goals },
        { name: 'Manage Users', path: '/admin/manage-users', icon: NavIcons.users },
        { name: 'Reports', path: '/admin/reports', icon: NavIcons.reports },
      ];
    }

    return [
      { name: 'Dashboard', path: '/user/dashboard', icon: NavIcons.dashboard },
      { name: 'WorkOS', path: '/user/workos', icon: NavIcons.workos },
      { name: 'Intelligence', path: '/user/intelligence', icon: NavIcons.intelligence },
      { name: 'My Tasks', path: '/user/my-tasks', icon: NavIcons.tasks },
    ];
  }, [user, effectiveRole]);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  if (!user) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-app-bg">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-sidebar text-white flex flex-col transform transition-all duration-200 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarCollapsed ? 'md:w-[72px]' : 'md:w-72'} w-72`}
      >
        <div
          className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-2 h-16 border-b border-slate-700/60`}
        >
          <div className="bg-primary p-2.5 rounded-xl shadow shrink-0">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <Link
              to="/"
              className="text-lg font-bold text-white whitespace-nowrap"
              onClick={closeSidebar}
            >
              Cadence
            </Link>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {getNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={closeSidebar}
              title={isSidebarCollapsed ? link.name : undefined}
              className={`group flex items-center gap-3 rounded-xl text-sm font-medium transition-colors ${
                isSidebarCollapsed ? 'justify-center px-1.5 py-2.5' : 'px-2 py-2.5'
              } ${
                isActive(link.path)
                  ? 'bg-white/6 text-white border border-white/10 shadow-sm'
                  : 'text-slate-300/80 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <span
                className={`shrink-0 text-slate-300/70 group-hover:text-white ${isActive(link.path) ? 'text-white' : ''}`}
              >
                {link.icon}
              </span>
              {!isSidebarCollapsed && link.name}
            </Link>
          ))}
        </nav>

        {!isSidebarCollapsed ? (
          <div className="px-2 pb-2">
            <OrgSwitcher />
          </div>
        ) : (
          <div className="px-2 pb-2">
            <div className="flex justify-center">
              <div
                className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center"
                title="Organization"
              >
                <span className="text-sm font-bold text-primary">
                  {user?.activeOrgId ? 'O' : '?'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-slate-700/60 p-2">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-full mb-3 p-2 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft
              className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
          <div className="relative">
            <Link
              to="/user/profile"
              onClick={closeSidebar}
              className={`flex items-center w-full px-2 py-2 rounded-xl hover:bg-white/5 transition-colors ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
              title={isSidebarCollapsed ? user.name : undefined}
            >
              {user.profileImageUrl ? (
                <img
                  className="h-9 w-9 rounded-full object-cover shrink-0"
                  src={user.profileImageUrl}
                  alt={`${user.name}'s profile`}
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm font-semibold shrink-0">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-white truncate">{user.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {effectiveRole === 'OrgAdmin' ? 'Admin' : 'Member'}
                  </div>
                </div>
              )}
            </Link>
          </div>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-72'}`}
      >
        <header className="sticky top-0 z-30 flex items-center h-14 bg-sidebar/95 backdrop-blur border-b border-slate-700/70 md:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-300 hover:bg-white/5"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-3 text-lg font-semibold text-white">Cadence</span>
        </header>

        <main className="flex-1">
          <div className="page">
            <div className="page-container py-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AuthLayout;
