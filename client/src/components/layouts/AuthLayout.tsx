import { useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import OrgSwitcher from '../common/OrgSwitcher';

const NavIcons: Record<string, ReactNode> = {
    dashboard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    tasks: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    ),
    create: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    reports: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    ),
    projects: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h6l2 2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
    ),
    goals: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a8 8 0 108 8m-8-8a8 8 0 00-8 8m16 0a8 8 0 01-8 8m0 0v2m0-2a8 8 0 01-8-8m8 8a8 8 0 008-8m-8 0a4 4 0 11-4-4" />
        </svg>
    ),
    workos: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3a1 1 0 011 1v1a1 1 0 01-2 0V4a1 1 0 011-1zm0 16a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zm8-8a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zM4 11a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zm12.364-6.364a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM7.757 14.95a1 1 0 010 1.414l-.707.707A1 1 0 115.636 15.657l.707-.707a1 1 0 011.414 0zm8.486 1.414a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM7.05 7.05a1 1 0 01-1.414 0l-.707-.707A1 1 0 116.343 4.93l.707.707a1 1 0 010 1.414z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
    ),
};

interface NavLink {
    name: string;
    path: string;
    icon: ReactNode;
}

function AuthLayout({ children }: { children: ReactNode }) {
    const { user, clearUser, getEffectiveRole } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const effectiveRole = getEffectiveRole();

    const handleLogout = useCallback(() => {
        clearUser();
        navigate('/login');
    }, [clearUser, navigate]);

    const isActive = useCallback((path: string) => {
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    }, [location.pathname]);

    const getNavLinks: NavLink[] = useMemo(() => {
        if (!user || !effectiveRole) return [];

        if (effectiveRole === 'OrgAdmin') {
            return [
                { name: 'Dashboard', path: '/admin/dashboard', icon: NavIcons.dashboard },
                { name: 'WorkOS', path: '/admin/workos', icon: NavIcons.workos },
                { name: 'Projects', path: '/admin/projects', icon: NavIcons.projects },
                { name: 'Goals', path: '/admin/goals', icon: NavIcons.goals },
                { name: 'Manage Users', path: '/admin/manage-users', icon: NavIcons.users },
                { name: 'Reports', path: '/admin/reports', icon: NavIcons.reports },
            ];
        }

        return [
            { name: 'Dashboard', path: '/user/dashboard', icon: NavIcons.dashboard },
            { name: 'WorkOS', path: '/user/workos', icon: NavIcons.workos },
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
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-2 h-16 border-b border-slate-700/60`}>
                    <div className="bg-primary p-2.5 rounded-xl shadow shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    {!isSidebarCollapsed && (
                        <Link to="/" className="text-lg font-bold text-white whitespace-nowrap" onClick={closeSidebar}>
                            Task Manager
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
                            <span className={`shrink-0 text-slate-300/70 group-hover:text-white ${isActive(link.path) ? 'text-white' : ''}`}>
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
                            <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center" title="Organization">
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
                        <svg className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className={`flex items-center w-full px-2 py-2 rounded-xl hover:bg-white/5 transition-colors ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
                            title={isSidebarCollapsed ? user.name : undefined}
                            aria-expanded={isUserMenuOpen}
                            aria-haspopup="true"
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
                                <>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{user.name}</div>
                                        <div className="text-xs text-slate-400 truncate">{effectiveRole === 'OrgAdmin' ? 'Admin' : 'Member'}</div>
                                    </div>
                                    <svg className={`h-4 w-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </>
                            )}
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-slate-900 border border-white/10 shadow-lg py-1 z-50">
                                <Link
                                    to="/user/profile"
                                    className="block px-4 py-2 text-sm text-slate-200 hover:bg-white/5 hover:text-white"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                    Profile
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-2 text-sm text-rose-300 hover:bg-white/5 hover:text-rose-200"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-72'}`}>
                <header className="sticky top-0 z-30 flex items-center h-14 bg-sidebar/95 backdrop-blur border-b border-slate-700/70 md:hidden">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-xl text-slate-300 hover:bg-white/5"
                        aria-label="Open sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="ml-3 text-lg font-semibold text-white">Task Manager</span>
                </header>

                <main className="flex-1">
                    <div className="page">
                        <div className="page-container py-4">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default AuthLayout;
