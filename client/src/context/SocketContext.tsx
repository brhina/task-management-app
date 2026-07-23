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
  createdAt: string;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  presence: Record<string, { userId: string; name?: string }>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  notifications: [],
  unreadCount: 0,
  refreshNotifications: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
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
    if (!user) return;
    try {
      const res = await api.get(apiPaths.NOTIFICATIONS.LIST);
      setNotifications(res.data.data?.notifications || []);
      setUnreadCount(res.data.data?.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refreshNotifications();
  }, [user, refreshNotifications]);

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

  const markAllRead = useCallback(async () => {
    await api.put(apiPaths.NOTIFICATIONS.READ_ALL);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({
      socket,
      connected,
      notifications,
      unreadCount,
      refreshNotifications,
      markRead,
      markAllRead,
      presence,
    }),
    [
      socket,
      connected,
      notifications,
      unreadCount,
      refreshNotifications,
      markRead,
      markAllRead,
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
