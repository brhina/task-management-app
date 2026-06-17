import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

function PublicLayout({ children, showHeader = true }: PublicLayoutProps) {
  return (
    <div className="public-page min-h-screen flex flex-col">
      {showHeader && (
        <header className="bg-sidebar/70 backdrop-blur border-b border-white/10">
          <div className="page-container">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-2">
                <div className="bg-primary p-2.5 rounded-xl shadow">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Cadence</span>
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  to="/login"
                  className="text-slate-200 hover:text-white transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl transition-colors font-medium shadow"
                >
                  Get Started
                </Link>
              </nav>
              <div className="md:hidden">
                <Link
                  to="/login"
                  className="text-slate-200 hover:text-white transition-colors text-sm font-medium"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1">
        <div className="page-container py-6">{children}</div>
      </main>
    </div>
  );
}

export default PublicLayout;
