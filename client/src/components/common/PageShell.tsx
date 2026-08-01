import { useState, useRef, useEffect, type ReactNode } from 'react';
import { MoreVertical, X } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import NotificationBell from './NotificationBell';

interface PageShellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  topSlot?: ReactNode;
  children?: ReactNode;
}

function PageShell({ title, subtitle, actions, topSlot, children }: PageShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="space-y-4">
      {topSlot}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
          <div className="flex-1 min-w-0 overflow-hidden">
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions && (
              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-xl bg-white text-slate-600 hover:text-slate-900 shadow-sm transition-colors flex items-center justify-center"
                  title="Actions menu"
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
                </button>
                {menuOpen && (
                  <div
                    onClick={() => setMenuOpen(false)}
                    className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    {actions}
                  </div>
                )}
              </div>
            )}
            <NotificationBell />
          </div>
        </div>
        <div className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex flex-wrap items-center gap-3">
          {title}
        </div>
        {subtitle && <div className="text-slate-500 text-sm">{subtitle}</div>}
      </div>
      <div className="page-section">{children}</div>
    </div>
  );
}

export default PageShell;
