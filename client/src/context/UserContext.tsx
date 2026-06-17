import { createContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import api from '../utils/axios';
import { apiPaths } from '../utils/apiPaths';
import type { User, UserContextType, OrgMembership } from '../types';

export const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    updateUser: () => {},
    clearUser: () => {},
    getEffectiveRole: () => null,
});

const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const hasFetchedRef = useRef(false);

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
                setUser(prevUser => {
                    if (prevUser && prevUser._id === userData._id) {
                        return prevUser;
                    }
                    return { ...userData, activeOrgId };
                });
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

    const updateUser = useCallback((userData: User & { token?: string; activeOrgId?: string; orgs?: OrgMembership[] }) => {
        setUser(prevUser => {
            const newUserData = {
                ...prevUser,
                ...userData,
                orgs: userData.orgs || prevUser?.orgs,
            };
            if (prevUser && prevUser._id === userData._id &&
                prevUser.email === userData.email &&
                prevUser.name === userData.name &&
                prevUser.role === userData.role &&
                prevUser.activeOrgId === userData.activeOrgId) {
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
    }, []);

    const clearUser = useCallback(() => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('activeOrgId');
        hasFetchedRef.current = false;
    }, []);

    const getEffectiveRole = useCallback((): 'OrgAdmin' | 'OrgMember' | null => {
        if (!user?.orgs || !user.activeOrgId) return null;
        const membership = user.orgs.find(
            (o) => o._id === user.activeOrgId || o.orgId === user.activeOrgId
        );
        return (membership?.role as 'OrgAdmin' | 'OrgMember') || null;
    }, [user]);

    const value = useMemo(() => ({
        user,
        loading,
        updateUser,
        clearUser,
        getEffectiveRole
    }), [user, loading, updateUser, clearUser, getEffectiveRole]);

    return (
        <UserContext.Provider value={value}>
        {children}
        </UserContext.Provider>
    );
};

export default UserProvider;
