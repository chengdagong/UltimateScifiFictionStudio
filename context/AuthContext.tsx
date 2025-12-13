import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
    user: string | null;
    token: string | null;
    login: (username: string, token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<string | null>(() => {
        return localStorage.getItem('user');
    });
    const [token, setToken] = useState<string | null>(() => {
        const savedToken = localStorage.getItem('token');
        // Immediately set axios header if token exists
        if (savedToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        }
        return savedToken;
    });

    const [isInitializing, setIsInitializing] = useState<boolean>(() => {
        return !!localStorage.getItem('token');
    });

    useEffect(() => {
        const verifyToken = async () => {
            if (token) {
                try {
                    // Temporarily set header if not set (though useState should have set it)
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    await axios.get('/api/auth/verify');
                } catch (error) {
                    console.warn("Token verification failed, logging out...");
                    logout();
                } finally {
                    setIsInitializing(false);
                }
            } else {
                setIsInitializing(false);
            }
        };

        verifyToken();
    }, []); // Only run on mount

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
        }

        if (user) {
            localStorage.setItem('user', user);
        } else {
            localStorage.removeItem('user');
        }
    }, [user, token]);

    const login = (username: string, newToken: string) => {
        // 同步设置 axios header 和 localStorage，确保后续 API 调用立即生效
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', username);

        // 然后更新 React 状态
        setUser(username);
        setToken(newToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isInitializing }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
