import React, { useContext, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';

function AuthLayout({ children }) {
    const { user, clearUser } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = useCallback(() => {
        clearUser();
        navigate('/login');
    }, [clearUser, navigate]);

    const isActive = useCallback((path) => {
        return location.pathname === path;
    }, [location.pathname]);

    const getNavLinks = useMemo(() => {
        if (!user) return [];

        if (user.role === 'Admin') {
            return [
                { name: 'Dashboard', path: '/admin/dashboard' },
                { name: 'Manage Tasks', path: '/admin/manage-tasks' },
                { name: 'Create Task', path: '/admin/create-task' },
                { name: 'Manage Users', path: '/admin/manage-users' },
                { name: 'Reports', path: '/admin/reports' },
            ];
        } else {
            return [
                { name: 'Dashboard', path: '/user/dashboard' },
                { name: 'My Tasks', path: '/user/my-tasks' },
            ];
        }
    }, [user]);

    // For public pages (login/signup), just render children without navigation
    if (!user) {
        return <div className="min-h-screen">{children}</div>;
    }

    return (
        <div className="min-h-screen">
            {/* Navigation */}
            <nav className="shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex-shrink-0 flex items-center">
                                <h1 className="text-xl font-bold text-white">Task Manager</h1>
                            </Link>
                            <div className="hidden md:ml-6 md:flex md:space-x-8">
                                {getNavLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                            isActive(link.path)
                                                ? 'border-blue-500 text-white'
                                                : 'border-transparent text-white hover:text-gray-400 hover:border-gray-300'
                                        }`}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center">
                            {/* User menu */}
                            <div className="ml-3 relative">
                                <div>
                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        aria-label="User menu"
                                        aria-expanded={isMenuOpen}
                                        aria-haspopup="true"
                                    >
                                        <div className="flex items-center space-x-3">
                                            {user.profileImageUrl && (
                                                <img
                                                    className="h-8 w-8 rounded-full"
                                                    src={user.profileImageUrl}
                                                    alt={`${user.name}'s profile`}
                                                />
                                            )}
                                            <div className="hidden md:block">
                                                <div className="text-sm font-medium text-white">{user.name}</div>
                                                <div className="text-xs text-white">{user.role}</div>
                                            </div>
                                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </button>
                                </div>

                                {isMenuOpen && (
                                    <div 
                                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                                        role="menu"
                                        aria-orientation="vertical"
                                    >
                                        <div className="px-4 py-2 text-sm text-white border-b border-gray-100">
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-white">{user.email}</div>
                                        </div>
                                        <Link
                                            to="/user/profile"
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-400"
                                            onClick={() => setIsMenuOpen(false)}
                                            role="menuitem"
                                        >
                                            Profile Settings
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-400"
                                            role="menuitem"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Mobile menu button */}
                            <div className="md:hidden ml-2">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                    aria-label="Toggle menu"
                                    aria-expanded={isMenuOpen}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <div className="md:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            {getNavLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                        isActive(link.path)
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'border-transparent text-white hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                                    }`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                        <div className="pt-4 pb-3 border-t border-gray-200">
                            <div className="mt-3 space-y-1">
                                <Link
                                    to="/user/profile"
                                    className="block w-full text-left px-4 py-2 text-base font-medium text-white hover:text-green-400 hover:bg-gray-100"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Profile Settings
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-2 text-base font-medium text-red-500 hover:text-red-800 hover:bg-gray-100"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main content */}
            <main>{children}</main>
        </div>
    );
}

export default AuthLayout;