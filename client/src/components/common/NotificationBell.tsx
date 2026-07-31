import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Sliders, ExternalLink, Circle, CheckCircle2 } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markUnread, markAllRead, deleteNotification } = useSocket();
  const [open, setOpen] = useState(false);
  const [unreadOnlyFilter, setUnreadOnlyFilter] = useState(false);
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

  const displayedNotifications = unreadOnlyFilter
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-extrabold text-white flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-88 max-h-[480px] flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-2xl z-50 overflow-hidden text-slate-800">
          {/* Popover Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <Link
                to={settingsPath}
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Notification Settings"
              >
                <Sliders className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUnreadOnlyFilter(false)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  !unreadOnlyFilter ? 'bg-slate-200/80 text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setUnreadOnlyFilter(true)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  unreadOnlyFilter ? 'bg-slate-200/80 text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* List Content */}
          <ul className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-80">
            {displayedNotifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-slate-400">
                {unreadOnlyFilter ? 'No unread notifications' : 'No notifications yet'}
              </li>
            ) : (
              displayedNotifications.map((n) => (
                <li
                  key={n._id}
                  className={`group relative p-3 transition-colors hover:bg-slate-50 flex items-start justify-between gap-2 ${
                    !n.read ? 'bg-cyan-50/20' : ''
                  }`}
                >
                  <Link
                    to={n.link || '#'}
                    onClick={() => {
                      if (!n.read) markRead(n._id);
                      setOpen(false);
                    }}
                    className="flex-1 min-w-0 flex items-start gap-2.5"
                  >
                    {!n.read ? (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                    ) : (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-transparent shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className={`text-xs font-medium text-slate-800 truncate ${!n.read ? 'font-bold' : ''}`}>
                        {n.title}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {n.message}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (n.read) markUnread(n._id);
                        else markRead(n._id);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-600 rounded"
                      title={n.read ? 'Mark unread' : 'Mark read'}
                    >
                      {n.read ? <Circle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n._id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Footer Navigation Link */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
            <Link
              to={settingsPath}
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-cyan-600 hover:text-cyan-700 py-1"
            >
              Open Notifications Hub & Settings
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
