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
  Menu,
  X,
  Sparkles,
  ShieldCheck,
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
  ai: <Sparkles className="w-5 h-5" />,
  enterprise: <ShieldCheck className="w-5 h-5" />,
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
      links.push(
        { name: 'Templates', path: '/tasks/templates', icon: NavIcons.templates },
        { name: 'Notifications', path: '/settings/notifications', icon: NavIcons.notifications },
        { name: 'Enterprise Center', path: '/settings/enterprise', icon: NavIcons.enterprise }
      );
      if (hasPermission('member:manage') || hasPermission('member:invite') || hasPermission('team:view')) {
        links.push({ name: 'Users & Teams', path: '/users', icon: NavIcons.users });
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
    <div className="flex flex-col md:flex-row min-h-screen bg-app-bg">
      {/* Mobile Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white/95 backdrop-blur-md border-b border-gray-200 md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-xs">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-800 tracking-tight">Cadence</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/users/profile"
            className="flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-primary/20 transition-all"
          >
            {user.profileImageUrl ? (
              <img
                className="h-8 w-8 rounded-full object-cover border border-slate-200"
                src={user.profileImageUrl}
                alt={user.name}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white text-slate-700 flex flex-col transform transition-all duration-200 ease-in-out border-r border-gray-200 shadow-2xl md:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'md:w-[72px]' : 'md:w-72'} w-72 sm:w-80`}
      >
        {/* Sidebar Header */}
        <div
          className={`flex items-center ${
            isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          } h-14 border-b border-gray-200 shrink-0`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary p-2 rounded-xl shadow-xs shrink-0">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <Link
                to="/"
                className="text-lg font-bold text-slate-800 tracking-tight truncate"
                onClick={closeSidebar}
              >
                Cadence
              </Link>
            )}
          </div>

          {/* Close button inside mobile drawer */}
          <button
            type="button"
            onClick={closeSidebar}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="px-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation
            </div>
          )}
          {getNavLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeSidebar}
                title={isSidebarCollapsed ? link.name : undefined}
                className={`group flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${
                  isSidebarCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'
                } ${
                  active
                    ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span
                  className={`shrink-0 transition-colors ${
                    active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                >
                  {link.icon}
                </span>
                {!isSidebarCollapsed && (
                  <span className="truncate flex-1">{link.name}</span>
                )}
                {!isSidebarCollapsed && active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Organization Switcher Footer */}
        <div className="border-t border-gray-100 px-3 py-3 shrink-0 bg-slate-50/50">
          {!isSidebarCollapsed ? (
            <div>
              <div className="px-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Workspace
              </div>
              <OrgSwitcher />
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div
                className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                title="Organization Switcher"
              >
                <span className="text-sm font-bold text-primary">
                  {user?.activeOrgId ? 'O' : '?'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Collapse & User Profile Footer */}
        <div className="border-t border-gray-200 p-3 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-full mb-2 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-gray-200/60"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft
              className={`w-4 h-4 transition-transform duration-200 ${
                isSidebarCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
          <Link
            to="/users/profile"
            onClick={closeSidebar}
            className={`flex items-center w-full p-2 rounded-xl hover:bg-slate-100 transition-colors ${
              isSidebarCollapsed ? 'justify-center' : 'gap-3'
            }`}
            title={isSidebarCollapsed ? user.name : undefined}
          >
            {user.profileImageUrl ? (
              <img
                className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200"
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
                <div className="text-sm font-semibold text-slate-800 truncate">{user.name}</div>
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
      </aside>

      {/* Main Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden transition-all duration-200 ${
          isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-72'
        }`}
      >
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="page">
            <div className="page-container py-4 md:py-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AuthLayout;
