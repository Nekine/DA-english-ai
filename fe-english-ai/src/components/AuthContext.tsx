import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/authService';

// New User interface matching backend UserDto
export interface User {
    userId: number;
    email: string;
    username?: string;
    fullName?: string;
    avatar?: string;
    role: string;
    status: string;
    emailVerified: boolean;
    accountType?: string;
    premiumExpiresAt?: string | null;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const refreshUser = async () => {
        try {
            // Skip refresh if no token (admin testing mode)
            const token = localStorage.getItem('engace_token');
            if (!token) {
                return;
            }
            
            const freshUser = await authService.refreshUser();
            if (freshUser) {
                setUser(freshUser as User);
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        // Loại bỏ việc tự động đăng nhập admin mặc định
        // else {
        //     setUser(defaultAdminUser);
        //     localStorage.setItem('user', JSON.stringify(defaultAdminUser));
        // }
    }, []);

    // Auto-refresh user data when window gains focus
    useEffect(() => {
        const handleFocus = async () => {
            if (user) {
                await refreshUser();
            }
        };

        window.addEventListener('focus', handleFocus);
        
        // Also refresh periodically every 5 minutes
        const interval = setInterval(() => {
            if (user) {
                refreshUser();
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
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