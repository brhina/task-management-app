import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Public Layout for unauthenticated users
 * Provides a clean layout for login, signup, and landing pages
 */
function PublicLayout({ children, showHeader = true }) {
    return (
        <div className="public-page min-h-screen flex flex-col">
            {showHeader && (
                <header className="bg-white bg-opacity-10 backdrop-blur-sm border-b border-white border-opacity-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <Link to="/" className="flex items-center space-x-2">
                                <div className="bg-primary p-2 rounded-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-white">Task Manager</span>
                            </Link>
                            <nav className="hidden md:flex items-center space-x-6">
                                <Link
                                    to="/login"
                                    className="text-white hover:text-indigo-200 transition-colors font-medium"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/signup"
                                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors font-medium"
                                >
                                    Get Started
                                </Link>
                            </nav>
                            <div className="md:hidden">
                                <Link
                                    to="/login"
                                    className="text-white hover:text-blue-200 transition-colors text-sm font-medium"
                                >
                                    Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>
            )}
            <main className="flex-1">{children}</main>
        </div>
    );
}

export default PublicLayout;

