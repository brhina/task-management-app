import React, { useContext, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';

const NavIcons = {
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
};

function AuthLayout({ children }) {
    const { user, clearUser } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const handleLogout = useCallback(() => {
        clearUser();
        navigate('/login');
    }, [clearUser, navigate]);

    const isActive = useCallback((path) => {
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    }, [location.pathname]);

    const getNavLinks = useMemo(() => {
        if (!user) return [];

        if (user.role === 'Admin') {
            return [
                { name: 'Dashboard', path: '/admin/dashboard', icon: NavIcons.dashboard },
                { name: 'Manage Tasks', path: '/admin/manage-tasks', icon: NavIcons.tasks },
                { name: 'Create Task', path: '/admin/create-task', icon: NavIcons.create },
                { name: 'Manage Users', path: '/admin/manage-users', icon: NavIcons.users },
                { name: 'Reports', path: '/admin/reports', icon: NavIcons.reports },
            ];
        }

        return [
            { name: 'Dashboard', path: '/user/dashboard', icon: NavIcons.dashboard },
            { name: 'My Tasks', path: '/user/my-tasks', icon: NavIcons.tasks },
        ];
    }, [user]);

    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

    if (!user) {
        return <div className="min-h-screen">{children}</div>;
    }

    return (
        <div className="flex min-h-screen bg-surface">
            {/* Mobile backdrop */}
            {isSidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
                    onClick={closeSidebar}
                    aria-label="Close sidebar"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-white flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center gap-3 px-2 h-16 border-b border-slate-700/60">
                    <div className="bg-primary p-2 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <Link to="/" className="text-lg font-bold text-white" onClick={closeSidebar}>
                        Task Manager
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {getNavLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={closeSidebar}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive(link.path)
                                    ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-400'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'
                            }`}
                        >
                            {link.icon}
                            {link.name}
                        </Link>
                    ))}
                </nav>

                <div className="border-t border-slate-700/60 p-4">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                            aria-expanded={isUserMenuOpen}
                            aria-haspopup="true"
                        >
                            {user.profileImageUrl ? (
                                <img
                                    className="h-9 w-9 rounded-full object-cover"
                                    src={user.profileImageUrl}
                                    alt={`${user.name}'s profile`}
                                />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold">
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            )}
                            <div className="flex-1 text-left min-w-0">
                                <div className="text-sm font-medium text-white truncate">{user.name}</div>
                                <div className="text-xs text-slate-400 truncate">{user.role}</div>
                            </div>
                            <svg className={`h-4 w-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg bg-slate-800 border border-slate-700 shadow-lg py-1 z-50">
                                <Link
                                    to="/user/profile"
                                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                    Profile Settings
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                <header className="sticky top-0 z-30 flex items-center h-14 bg-sidebar border-b border-slate-700 md:hidden">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-lg text-slate-300 hover:bg-slate-800"
                        aria-label="Open sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="ml-3 text-lg font-semibold text-white">Task Manager</span>
                </header>

                <main className="flex-1 bg-sidebar p-2 lg:p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default AuthLayout;
