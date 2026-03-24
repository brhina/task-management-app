import { createContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../utils/axios';
import { apiPaths } from '../utils/apiPaths';

export const UserContext = createContext();

const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        // Prevent multiple fetches
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
                const newUser = response?.data;
                if (!newUser || typeof newUser !== 'object' || newUser._id == null) {
                    console.error('Error fetching user: invalid profile payload');
                    localStorage.removeItem('token');
                    hasFetchedRef.current = false;
                    return;
                }
                setUser(prevUser => {
                    if (prevUser && prevUser._id === newUser._id) {
                        return prevUser;
                    }
                    return newUser;
                });
            } catch (error) {
                console.error('Error fetching user:', error);
                if (error?.response?.status === 401) {
                    localStorage.removeItem('token');
                }
                hasFetchedRef.current = false;
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const updateUser = useCallback((userData) => {
        setUser(prevUser => {
            // Only update if data actually changed (compare key fields)
            if (prevUser && prevUser._id === userData._id && 
                prevUser.email === userData.email &&
                prevUser.name === userData.name &&
                prevUser.role === userData.role) {
                return prevUser;
            }
            return userData;
        });
        if (userData.token) {
            localStorage.setItem('token', userData.token);
        }
        setLoading(false);
    }, []);

    const clearUser = useCallback(() => {
        setUser(null);
        localStorage.removeItem('token');
        hasFetchedRef.current = false; // Allow refetch after logout
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        updateUser,
        clearUser
    }), [user, loading, updateUser, clearUser]);

    return (
        <UserContext.Provider value={value}>
        {children}
        </UserContext.Provider>
    );
}

export default UserProvider;