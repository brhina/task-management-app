import {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import api from '../utils/axios';
import { apiPaths } from '../utils/apiPaths';
import type { User, UserContextType, OrgMembership, OrgRole } from '../types';
import {
  canAccessAdminSuite as roleCanAccessAdmin,
  getPermissionsForRole,
  type Permission,
} from '../constants/permissions';

export const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  currency: "ETB",
  updateUser: () => {},
  clearUser: () => {},
  getEffectiveRole: () => null,
  permissions: [],
  hasPermission: () => false,
  canAccessAdminSuite: () => false,
});

const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [activeOrgBranding, setActiveOrgBranding] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<string | null>("Free");
  const [currency, setCurrency] = useState<string>("ETB");
  const hasFetchedRef = useRef(false);

  const getEffectiveRole = useCallback((): OrgRole | null => {
    if (!user?.orgs || !user.activeOrgId) return null;
    const membership = user.orgs.find(
      (o) => o._id === user.activeOrgId || o.orgId === user.activeOrgId
    );
    return (membership?.role as OrgRole) || null;
  }, [user]);

  const refreshOrgDetails = useCallback(async () => {
    if (!user?.activeOrgId) return;
    try {
      const [brandingRes, billingRes] = await Promise.all([
        api.get("/api/branding").catch(() => null),
        api.get("/api/billing/metrics").catch(() => null),
      ]);
      if (brandingRes?.data) setActiveOrgBranding(brandingRes.data);
      if (billingRes?.data?.plan) setActivePlan(billingRes.data.plan);
      if (billingRes?.data?.currency) setCurrency(billingRes.data.currency);
    } catch {
      /* ignore default fallback */
    }
  }, [user?.activeOrgId]);

  const refreshPermissions = useCallback(async () => {
    try {
      const response = await api.get(apiPaths.ROLES.ME);
      setPermissions(response.data?.data?.permissions || []);
    } catch {
      const role = (() => {
        if (!user?.orgs || !user.activeOrgId) return null;
        const membership = user.orgs.find(
          (o) => o._id === user.activeOrgId || o.orgId === user.activeOrgId
        );
        return membership?.role || null;
      })();
      setPermissions(getPermissionsForRole(role));
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setActiveOrgBranding(null);
      setActivePlan("Free");
      return;
    }
    void refreshPermissions();
    void refreshOrgDetails();
  }, [user?.activeOrgId, user?._id, refreshPermissions, refreshOrgDetails]);

  useEffect(() => {
    if (hasFetchedRef.current) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      hasFetchedRef.current = true;
      return;
    }

    const fetchUser = async () => {
      try {
        hasFetchedRef.current = true;
        const response = await api.get(apiPaths.AUTH.GET_USER_PROFILE);
        const userData = response?.data;
        if (!userData || typeof userData !== 'object' || userData._id == null) {
          console.error('Error fetching user: invalid profile payload');
          localStorage.removeItem('token');
          hasFetchedRef.current = false;
          return;
        }
        const activeOrgId = localStorage.getItem('activeOrgId') || userData.activeOrgId;
        if (activeOrgId) {
          localStorage.setItem('activeOrgId', activeOrgId);
        }

        let orgs = userData.orgs;
        try {
          const orgsRes = await api.get(apiPaths.ORG_MEMBERSHIP.MY_ORGS);
          orgs = orgsRes.data;
        } catch {
          /* keep profile orgs */
        }

        setUser({ ...userData, activeOrgId, orgs });
      } catch (error) {
        console.error('Error fetching user:', error);
        if ((error as any)?.response?.status === 401) {
          localStorage.removeItem('token');
        }
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const updateUser = useCallback(
    (userData: User & { token?: string; activeOrgId?: string; orgs?: OrgMembership[] }) => {
      setUser((prevUser) => {
        const newUserData = {
          ...prevUser,
          ...userData,
          orgs: userData.orgs || prevUser?.orgs,
        };
        if (
          prevUser &&
          prevUser._id === userData._id &&
          prevUser.email === userData.email &&
          prevUser.name === userData.name &&
          prevUser.role === userData.role &&
          prevUser.activeOrgId === userData.activeOrgId
        ) {
          return prevUser;
        }
        return newUserData;
      });
      if (userData.token) {
        localStorage.setItem('token', userData.token);
      }
      if (userData.activeOrgId) {
        localStorage.setItem('activeOrgId', userData.activeOrgId);
      }
      setLoading(false);
    },
    []
  );

  const clearUser = useCallback(() => {
    setUser(null);
    setPermissions([]);
    setActiveOrgBranding(null);
    setActivePlan("Free");
    localStorage.removeItem('token');
    localStorage.removeItem('activeOrgId');
    hasFetchedRef.current = false;
  }, []);

  const hasPermissionFn = useCallback(
    (permission: string) => permissions.includes(permission as Permission),
    [permissions]
  );

  const canAccessAdminSuiteFn = useCallback(() => {
    const role = getEffectiveRole();
    if (roleCanAccessAdmin(role)) return true;
    return (
      hasPermissionFn('org:manage') ||
      hasPermissionFn('project:manage') ||
      hasPermissionFn('task:create') ||
      hasPermissionFn('report:view') ||
      hasPermissionFn('member:manage')
    );
  }, [getEffectiveRole, hasPermissionFn]);

  const value = useMemo(
    () => ({
      user,
      loading,
      activeOrgBranding,
      activePlan,
      currency,
      updateUser,
      clearUser,
      getEffectiveRole,
      permissions,
      hasPermission: hasPermissionFn,
      canAccessAdminSuite: canAccessAdminSuiteFn,
    }),
    [
      user,
      loading,
      activeOrgBranding,
      activePlan,
      currency,
      updateUser,
      clearUser,
      getEffectiveRole,
      permissions,
      hasPermissionFn,
      canAccessAdminSuiteFn,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;
