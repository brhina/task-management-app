import { useEffect, useState, type FormEvent, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import NavTabs from '../../components/common/NavTabs';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { useSocket, playNotificationChime, type AppNotification } from '../../context/SocketContext';
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  Circle,
  AtSign,
  MessageSquare,
  Clock,
  ClipboardList,
  Sliders,
  Volume2,
  VolumeX,
  Moon,
  ExternalLink,
  Mail,
  Sparkles,
  Inbox,
  Filter,
  Check,
} from 'lucide-react';

type Channel = 'in_app' | 'email' | 'both' | 'none';
type Digest = 'none' | 'daily' | 'weekly';

interface Prefs {
  taskAssigned: Channel;
  mentions: Channel;
  statusChanged: Channel;
  comments: Channel;
  dueDateReminder: Channel;
  digestFrequency: Digest;
  soundEnabled: boolean;
  doNotDisturb: boolean;
}

const CHANNELS: Array<{ id: Channel; label: string; desc: string }> = [
  { id: 'both', label: 'In-App & Email', desc: 'Notify on screen and send an email' },
  { id: 'in_app', label: 'In-App Only', desc: 'Show in top bell & notification page' },
  { id: 'email', label: 'Email Only', desc: 'Send to registered email address' },
  { id: 'none', label: 'Disabled', desc: 'Do not notify for this event' },
];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNotificationBadge(type: string) {
  switch (type) {
    case 'task_assigned':
      return {
        icon: <ClipboardList className="w-4 h-4 text-blue-600" />,
        bg: 'bg-blue-50 border-blue-200 text-blue-700',
        label: 'Task Assigned',
      };
    case 'task_status_changed':
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        label: 'Status Change',
      };
    case 'mention':
      return {
        icon: <AtSign className="w-4 h-4 text-purple-600" />,
        bg: 'bg-purple-50 border-purple-200 text-purple-700',
        label: 'Mentioned',
      };
    case 'comment_added':
      return {
        icon: <MessageSquare className="w-4 h-4 text-sky-600" />,
        bg: 'bg-sky-50 border-sky-200 text-sky-700',
        label: 'Comment',
      };
    case 'due_date_approaching':
      return {
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
        label: 'Due Soon',
      };
    default:
      return {
        icon: <Bell className="w-4 h-4 text-indigo-600" />,
        bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        label: 'System Alert',
      };
  }
}

export default function NotificationSettings() {
  const {
    connected,
    notifications: socketNotifications,
    unreadCount,
    markRead,
    markUnread,
    markAllRead,
    deleteNotification,
    clearNotifications,
    refreshNotifications,
  } = useSocket();

  const [activeTab, setActiveTab] = useState<'inbox' | 'settings'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [localNotifications, setLocalNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  // Preference State
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch preferences
  useEffect(() => {
    api
      .get(apiPaths.NOTIFICATIONS.PREFERENCES)
      .then((r) => setPrefs(r.data.data))
      .catch(console.error);
  }, []);

  // Fetch paginated / filtered notifications
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        page,
        limit: 15,
      };
      if (filterType === 'unread') {
        params.unread = true;
      } else if (filterType !== 'all') {
        params.type = filterType;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get(apiPaths.NOTIFICATIONS.LIST, { params });
      const data = res.data?.data;
      if (data) {
        setLocalNotifications(data.notifications || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications list:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, searchQuery]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Keep local notifications in sync with real-time socket events when on page 1 with no search filter
  useEffect(() => {
    if (page === 1 && !searchQuery && filterType === 'all') {
      setLocalNotifications(socketNotifications);
    }
  }, [socketNotifications, page, searchQuery, filterType]);

  const handleSavePrefs = async (e: FormEvent) => {
    e.preventDefault();
    if (!prefs) return;
    setSavingPrefs(true);
    setPrefsMessage(null);
    try {
      await api.put(apiPaths.NOTIFICATIONS.PREFERENCES, prefs);
      setPrefsMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
      setTimeout(() => setPrefsMessage(null), 4000);
    } catch (err: any) {
      setPrefsMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save notification preferences',
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleMarkReadToggle = async (id: string, currentReadState: boolean) => {
    try {
      if (currentReadState) {
        await markUnread(id);
      } else {
        await markRead(id);
      }
      setLocalNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: !currentReadState } : n))
      );
    } catch (err) {
      console.error('Failed to toggle read state:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setLocalNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotalCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearRead = async () => {
    try {
      await clearNotifications(true);
      fetchList();
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const categories = [
    { id: 'all', label: 'All Notifications', icon: Inbox },
    { id: 'unread', label: 'Unread', icon: Bell },
    { id: 'tasks', label: 'Task Updates', icon: ClipboardList },
    { id: 'mentions', label: 'Mentions', icon: AtSign },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'reminders', label: 'Reminders', icon: Clock },
  ];

  return (
    <PageShell
      title="Notifications Hub"
      subtitle="View all activity, manage alerts, and customize notification preferences"
    >
      <div className="space-y-6">
        {/* Tab Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <NavTabs<'inbox' | 'settings'>
            tabs={[
              { id: 'inbox', label: 'Notification Inbox', icon: Inbox, badge: unreadCount || undefined },
              { id: 'settings', label: 'Preferences & Delivery', icon: Sliders },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Action buttons straight on the tabs bar */}
          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                refreshNotifications();
                fetchList();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/60 rounded-xl transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={handleClearRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear read
            </button>
          </div>
        </div>

        {/* TAB 1: NOTIFICATIONS INBOX */}
        {activeTab === 'inbox' && (
          <div className="space-y-5">
            {/* Search & Filter Pills */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Filter Pills */}
              <NavTabs
                size="sm"
                tabs={categories.map((cat) => ({
                  id: cat.id,
                  label: cat.label,
                  icon: cat.icon,
                }))}
                activeTab={filterType}
                onChange={(id) => {
                  setFilterType(id);
                  setPage(1);
                }}
              />

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>
            </div>

            {/* List View */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {loading && localNotifications.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                  Loading notifications...
                </div>
              ) : localNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700">No notifications found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {searchQuery || filterType !== 'all'
                      ? 'No notifications match your current filter or search criteria.'
                      : 'You are all caught up! New notifications will appear here when events occur.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {localNotifications.map((n) => {
                    const badge = getNotificationBadge(n.type);
                    return (
                      <li
                        key={n._id}
                        className={`group relative p-4 transition-all hover:bg-slate-50/80 flex items-start justify-between gap-4 ${
                          !n.read ? 'bg-cyan-50/30' : ''
                        }`}
                      >
                        {/* Unread Accent Bar */}
                        {!n.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-r" />
                        )}

                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Type Badge Icon */}
                          <div
                            className={`p-2.5 rounded-xl border shrink-0 ${badge.bg}`}
                            title={badge.label}
                          >
                            {badge.icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-sm font-semibold text-slate-800 ${!n.read ? 'font-bold' : ''}`}>
                                {n.title}
                              </h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600">
                                {badge.label}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>

                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                              <span>{formatRelativeTime(n.createdAt)}</span>
                              <span>•</span>
                              <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                              {n.link && (
                                <>
                                  <span>•</span>
                                  <Link
                                    to={n.link}
                                    onClick={() => {
                                      if (!n.read) markRead(n._id);
                                    }}
                                    className="inline-flex items-center gap-1 font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
                                  >
                                    View item
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMarkReadToggle(n._id, n.read)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              n.read
                                ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
                                : 'text-cyan-600 hover:bg-cyan-100'
                            }`}
                            title={n.read ? 'Mark as unread' : 'Mark as read'}
                          >
                            {n.read ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 fill-cyan-500 text-white" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(n._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-600">
                  <span>
                    Showing Page <strong className="font-semibold text-slate-800">{page}</strong> of{' '}
                    <strong className="font-semibold text-slate-800">{totalPages}</strong> ({totalCount} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-100 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-100 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PREFERENCES & SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSavePrefs} className="space-y-6">
            {!prefs ? (
              <div className="p-8 text-center text-slate-400">Loading preferences…</div>
            ) : (
              <>
                {/* Save Feedback Alert */}
                {prefsMessage && (
                  <div
                    className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      prefsMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    {prefsMessage.text}
                  </div>
                )}

                {/* Event Delivery Channels Grid */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Event Notifications</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure how you would like to be alerted for each specific event type.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {[
                      { key: 'taskAssigned', label: 'Task Assignment', desc: 'When a task is assigned to you or transferred' },
                      { key: 'mentions', label: 'Direct Mentions', desc: 'When someone @mentions you in a task or comment' },
                      { key: 'statusChanged', label: 'Status Updates', desc: 'When a task you follow changes status' },
                      { key: 'comments', label: 'Comments', desc: 'When new comments are posted on your tasks' },
                      { key: 'dueDateReminder', label: 'Due Date Reminders', desc: 'When task due dates are approaching' },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100"
                      >
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{item.label}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </div>

                        {/* Channel selector pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {CHANNELS.map((ch) => {
                            const isSelected = prefs[item.key as keyof Prefs] === ch.id;
                            return (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() =>
                                  setPrefs({
                                    ...prefs,
                                    [item.key]: ch.id,
                                  })
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                                  isSelected
                                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                                title={ch.desc}
                              >
                                {ch.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email Digest & Sound Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email Digest Settings */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Email Digest</h3>
                        <p className="text-xs text-slate-500">Summary of missed activity</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      {[
                        { id: 'none', label: 'No Digest', desc: 'Do not send periodic email summaries' },
                        { id: 'daily', label: 'Daily Summary', desc: 'Receive a daily recap every morning' },
                        { id: 'weekly', label: 'Weekly Summary', desc: 'Receive a digest every Monday' },
                      ].map((d) => (
                        <label
                          key={d.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            prefs.digestFrequency === d.id
                              ? 'bg-blue-50/40 border-blue-300 text-blue-950'
                              : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="digestFrequency"
                            value={d.id}
                            checked={prefs.digestFrequency === d.id}
                            onChange={(e) =>
                              setPrefs({
                                ...prefs,
                                digestFrequency: e.target.value as Digest,
                              })
                            }
                            className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                          />
                          <div>
                            <div className="text-xs font-bold">{d.label}</div>
                            <div className="text-[11px] text-slate-500">{d.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sound & Do Not Disturb */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Audio & Quiet Hours</h3>
                        <p className="text-xs text-slate-500">Manage sound chime and DND mode</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      {/* Audio Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          {prefs.soundEnabled ? (
                            <Volume2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-slate-400" />
                          )}
                          <div>
                            <div className="text-xs font-bold text-slate-800">In-App Chime Sound</div>
                            <div className="text-[11px] text-slate-500">Play audio chime on new notification</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playNotificationChime()}
                            className="text-[10px] font-semibold px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700"
                          >
                            Test
                          </button>
                          <input
                            type="checkbox"
                            checked={prefs.soundEnabled ?? true}
                            onChange={(e) =>
                              setPrefs({
                                ...prefs,
                                soundEnabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Do Not Disturb Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <Moon className={`w-4 h-4 ${prefs.doNotDisturb ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <div>
                            <div className="text-xs font-bold text-slate-800">Do Not Disturb Mode</div>
                            <div className="text-[11px] text-slate-500">Silence popups and audio alerts</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefs.doNotDisturb ?? false}
                          onChange={(e) =>
                            setPrefs({
                              ...prefs,
                              doNotDisturb: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPrefs}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {savingPrefs ? 'Saving Changes…' : 'Save Notification Preferences'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </PageShell>
  );
}
