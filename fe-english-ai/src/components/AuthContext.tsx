import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/authService';

// New User interface matching backend UserDto
export interface User {
    userId: number;
    email: string;
    username?: string;
    fullName?: string;
    avatar?: string;
    currentLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
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

const USER_KEY = 'user';
const LEGACY_USER_KEY = 'engace_user';

function readUserFromStorage(): User | null {
    try {
        const primary = localStorage.getItem(USER_KEY);
        if (primary) {
            return JSON.parse(primary) as User;
        }

        const legacy = localStorage.getItem(LEGACY_USER_KEY);
        if (legacy) {
            return JSON.parse(legacy) as User;
        }
    } catch (error) {
        console.error('Failed to parse stored user:', error);
    }

    return null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => readUserFromStorage());

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(USER_KEY);
        authService.logout();
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
                localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
                localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(freshUser));
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

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