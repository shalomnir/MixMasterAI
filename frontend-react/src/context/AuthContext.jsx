import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => api.getUser());
    const [isAuthenticated, setIsAuthenticated] = useState(() => api.isAuthenticated());
    const [isAdmin, setIsAdmin] = useState(() => api.isAdmin());
    const [isLoading, setIsLoading] = useState(false);

    // Listen for auth expiration
    useEffect(() => {
        const handleAuthExpired = () => {
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
        };

        window.addEventListener('auth:expired', handleAuthExpired);
        return () => window.removeEventListener('auth:expired', handleAuthExpired);
    }, []);

    const register = useCallback(async (nickname) => {
        setIsLoading(true);
        try {
            const response = await api.register(nickname);
            if (response.status === 'success') {
                setUser(response.user);
                setIsAuthenticated(true);
                setIsAdmin(false);
            }
            return response;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (nickname, password = null) => {
        setIsLoading(true);
        try {
            const response = await api.login(nickname, password);
            if (response.status === 'success') {
                if (response.is_admin) {
                    setUser({ is_admin: true, nickname: 'Admin' });
                    setIsAdmin(true);
                } else {
                    setUser(response.user);
                    setIsAdmin(false);
                }
                setIsAuthenticated(true);
            }
            return response;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loginAsAdmin = useCallback(() => {
        // Transient Admin Bypass - Admin2001
        sessionStorage.setItem('cocktail_auth_token', 'admin-session-token');
        sessionStorage.setItem('cocktail_user', JSON.stringify({
            nickname: 'Admin',
            is_admin: true
        }));
        setUser({ nickname: 'Admin', is_admin: true });
        setIsAuthenticated(true);
        setIsAdmin(true);
    }, []);

    const recover = useCallback(async (recoveryKey) => {
        setIsLoading(true);
        try {
            const response = await api.recover(recoveryKey);
            if (response.status === 'success') {
                setUser(response.user);
                setIsAuthenticated(true);
                setIsAdmin(false);
            }
            return response;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        api.logout();
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
    }, []);

    const value = {
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        register,
        login,
        loginAsAdmin,
        recover,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
