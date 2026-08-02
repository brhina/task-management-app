import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, LogIn, UserPlus } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

function PublicLayout({ children, showHeader = true }: PublicLayoutProps) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isSignUpPage = location.pathname === '/signup';

  return (
    <div className="public-page min-h-screen flex flex-col relative z-10">
      {showHeader && (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-2xs transition-all">
          <div className="page-container">
            <div className="flex justify-between items-center h-13">
              <Link to="/" className="flex items-center space-x-2.5 group">
                <div className="bg-primary p-1.5 rounded-lg shadow group-hover:bg-primary-hover transition-colors">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-slate-800 tracking-tight">Cadence</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-primary-light text-primary border border-primary/30">
                    Enterprise
                  </span>
                </div>
              </Link>

              <nav className="flex items-center space-x-2 sm:space-x-3">
                <Link
                  to="/"
                  className="hidden md:inline-flex text-xs font-semibold text-slate-600 hover:text-primary transition-colors px-2 py-1"
                >
                  Features
                </Link>
                
                {!isLoginPage && (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    Sign In
                  </Link>
                )}

                {!isSignUpPage && (
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1 bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1">
        <div className="page-container py-3 sm:py-4">{children}</div>
      </main>
    </div>
  );
}

export default PublicLayout;
