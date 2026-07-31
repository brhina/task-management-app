import { useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import OrgSwitcher from '../common/OrgSwitcher';
import { ROLE_LABELS } from '../../constants/permissions';
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
  ClipboardList,
  FileText,
  UsersRound,
  Bell,
  Shield,
  ScrollText,
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
  templates: <FileText className="w-5 h-5" />,
  resources: <UsersRound className="w-5 h-5" />,
  notifications: <Bell className="w-5 h-5" />,
  teams: <UsersRound className="w-5 h-5" />,
  roles: <Shield className="w-5 h-5" />,
  audit: <ScrollText className="w-5 h-5" />,
};

interface NavLink {
  name: string;
  path: string;
  icon: ReactNode;
}

function AuthLayout({ children }: { children: ReactNode }) {
  const { user, canAccessAdminSuite, hasPermission, getEffectiveRole } =
    useContext(UserContext);
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isActive = useCallback(
    (path: string) => {
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  const getNavLinks: NavLink[] = useMemo(() => {
    if (!user) return [];

    if (canAccessAdminSuite()) {
      const links: NavLink[] = [
        { name: 'Dashboard', path: '/dashboard', icon: NavIcons.dashboard },
        { name: 'WorkOS', path: '/settings/workos', icon: NavIcons.workos },
        { name: 'Projects', path: '/projects', icon: NavIcons.projects },
        { name: 'Goals', path: '/goals', icon: NavIcons.goals },
        { name: 'Resources', path: '/resources', icon: NavIcons.resources },
      ];
      if (hasPermission('team:view')) {
        links.push({ name: 'Teams', path: '/teams', icon: NavIcons.teams });
      }
      links.push(
        { name: 'Templates', path: '/tasks/templates', icon: NavIcons.templates },
        { name: 'Notifications', path: '/settings/notifications', icon: NavIcons.notifications },
      );
      if (hasPermission('member:manage') || hasPermission('member:invite')) {
        links.push({ name: 'Manage Users', path: '/users', icon: NavIcons.users });
      }
      if (hasPermission('role:manage')) {
        links.push({ name: 'Roles', path: '/settings/roles', icon: NavIcons.roles });
      }
      if (hasPermission('org:audit')) {
        links.push({ name: 'Audit Log', path: '/audit', icon: NavIcons.audit });
      }
      if (hasPermission('report:view')) {
        links.push({ name: 'Reports', path: '/reports', icon: NavIcons.reports });
      }
      return links;
    }

    return [
      { name: 'Dashboard', path: '/dashboard', icon: NavIcons.dashboard },
      { name: 'WorkOS', path: '/settings/workos', icon: NavIcons.workos },
      { name: 'My Tasks', path: '/tasks', icon: NavIcons.tasks },
      {
        name: 'Notifications',
        path: '/settings/notifications',
        icon: NavIcons.notifications,
      },
    ];
  }, [user, canAccessAdminSuite, hasPermission]);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  if (!user) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
      <div className="flex min-h-screen bg-app-bg">
        {isSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-sidebar text-slate-700 flex flex-col transform transition-all duration-200 ease-in-out md:translate-x-0 border-r border-gray-200 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isSidebarCollapsed ? 'md:w-[72px]' : 'md:w-72'} w-72`}
        >
        <div
          className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-2 h-12 border-b border-gray-200`}
        >
          <div className="bg-primary p-2.5 rounded-xl shadow shrink-0">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <Link
              to="/"
              className="text-lg font-bold text-slate-800 whitespace-nowrap"
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
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-slate-600 hover:bg-gray-100 hover:text-slate-800 border border-transparent'
              }`}
            >
              <span
                className={`shrink-0 ${isActive(link.path) ? 'text-primary' : 'text-slate-500 group-hover:text-slate-700'}`}
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
                className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"
                title="Organization"
              >
                <span className="text-sm font-bold text-primary">
                  {user?.activeOrgId ? 'O' : '?'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 p-2">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-full mb-3 p-2 rounded-xl text-slate-500 hover:bg-gray-100 hover:text-slate-700 transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft
              className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
          <div className="relative">
            <Link
              to="/users/profile"
              onClick={closeSidebar}
              className={`flex items-center w-full px-2 py-2 rounded-xl hover:bg-gray-100 transition-colors ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
              title={isSidebarCollapsed ? user.name : undefined}
            >
              {user.profileImageUrl ? (
                <img
                  className="h-9 w-9 rounded-full object-cover shrink-0"
                  src={user.profileImageUrl}
                  alt={`${user.name}'s profile`}
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{user.name}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {(() => {
                      const role = getEffectiveRole();
                      if (!role) return 'Member';
                      if (role === 'Custom') return 'Custom';
                      return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
                    })()}
                  </div>
                </div>
              )}
            </Link>
          </div>
        </div>
        </aside>

        <div
          className={`flex-1 flex h-screen overflow-hidden transition-all duration-200 ${isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-72'}`}
        >
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <main className="flex-1 min-w-0 overflow-y-auto">
              <div className="page">
                <div className="page-container py-4">{children}</div>
              </div>
            </main>
          </div>

        </div>
      </div>
  );
}

export default AuthLayout;
