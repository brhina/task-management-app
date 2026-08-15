import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { BASE_URL, apiPaths } from '../utils/apiPaths';
import api from '../utils/axios';
import { UserContext } from './UserContext';

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Audio context may be restricted by browser until user gesture
  }
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markUnread: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: (readOnly?: boolean) => Promise<void>;
  presence: Record<string, { userId: string; name?: string }>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  notifications: [],
  unreadCount: 0,
  refreshNotifications: async () => {},
  markRead: async () => {},
  markUnread: async () => {},
  markAllRead: async () => {},
  deleteNotification: async () => {},
  clearNotifications: async () => {},
  presence: {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useContext(UserContext);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [presence, setPresence] = useState<
    Record<string, { userId: string; name?: string }>
  >({});

  const refreshNotifications = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const res = await api.get(apiPaths.NOTIFICATIONS.LIST);
      setNotifications(res.data.data?.notifications || []);
      setUnreadCount(res.data.data?.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void refreshNotifications();
  }, [user?._id, user?.activeOrgId, refreshNotifications]);

  useEffect(() => {
    if (!user) {
      socket?.disconnect();
      setSocket(null);
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const s = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setConnected(true);
      const orgId = localStorage.getItem('activeOrgId');
      if (orgId) s.emit('join_org', orgId);
    });
    s.on('disconnect', () => setConnected(false));

    s.on('notification', (n: AppNotification) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
      playNotificationChime();
    });

    s.on(
      'presence_update',
      (p: { userId: string; name?: string; viewingTaskId: string | null }) => {
        setPresence((prev) => {
          const next = { ...prev };
          if (!p.viewingTaskId) {
            delete next[p.userId];
          } else {
            next[p.userId] = {
              userId: p.userId,
              name: p.name,
            };
            (next[p.userId] as any).viewingTaskId = p.viewingTaskId;
          }
          return next;
        });
      },
    );

    // Re-join org when active org changes
    const onStorage = () => {
      const orgId = localStorage.getItem('activeOrgId');
      if (orgId && s.connected) s.emit('join_org', orgId);
    };
    window.addEventListener('storage', onStorage);

    setSocket(s);

    return () => {
      window.removeEventListener('storage', onStorage);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Re-join org when user context org changes
  useEffect(() => {
    const orgId = localStorage.getItem('activeOrgId');
    if (socket?.connected && orgId) {
      socket.emit('join_org', orgId);
    }
  }, [socket, user?.activeOrgId]);

  const markRead = useCallback(async (id: string) => {
    await api.put(apiPaths.NOTIFICATIONS.READ.replace(':id', id));
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markUnread = useCallback(async (id: string) => {
    await api.put(apiPaths.NOTIFICATIONS.UNREAD.replace(':id', id));
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: false } : n)),
    );
    setUnreadCount((c) => c + 1);
  }, []);

  const markAllRead = useCallback(async () => {
    await api.put(apiPaths.NOTIFICATIONS.READ_ALL);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    await api.delete(apiPaths.NOTIFICATIONS.DELETE.replace(':id', id));
    setNotifications((prev) => {
      const item = prev.find((n) => n._id === id);
      if (item && !item.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n._id !== id);
    });
  }, []);

  const clearNotifications = useCallback(async (readOnly = true) => {
    await api.delete(`${apiPaths.NOTIFICATIONS.CLEAR}?readOnly=${readOnly}`);
    if (readOnly) {
      setNotifications((prev) => prev.filter((n) => !n.read));
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const value = useMemo(
    () => ({
      socket,
      connected,
      notifications,
      unreadCount,
      refreshNotifications,
      markRead,
      markUnread,
      markAllRead,
      deleteNotification,
      clearNotifications,
      presence,
    }),
    [
      socket,
      connected,
      notifications,
      unreadCount,
      refreshNotifications,
      markRead,
      markUnread,
      markAllRead,
      deleteNotification,
      clearNotifications,
      presence,
    ],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export default SocketContext;
