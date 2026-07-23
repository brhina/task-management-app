import { useState, useRef, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { UserContext } from '../../context/UserContext';

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useSocket();
  const { getEffectiveRole } = useContext(UserContext);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const settingsPath = '/settings/notifications';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
            <span className="text-sm font-semibold text-slate-200">
              Notifications
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  Mark all read
                </button>
              )}
              <Link
                to={settingsPath}
                onClick={() => setOpen(false)}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Settings
              </Link>
            </div>
          </div>
          <ul className="overflow-y-auto max-h-80">
            {notifications.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                No notifications yet
              </li>
            )}
            {notifications.map((n) => (
              <li key={n._id}>
                <Link
                  to={n.link || '#'}
                  onClick={() => {
                    if (!n.read) markRead(n._id);
                    setOpen(false);
                  }}
                  className={`block px-3 py-2.5 border-b border-slate-800 hover:bg-slate-800/60 ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {n.title}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        {n.message}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
