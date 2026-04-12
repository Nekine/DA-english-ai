import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';
import { authService } from '@/services/authService';

interface ProtectedRouteProps {
    children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user } = useAuth();
    const hasValidToken = authService.isAuthenticated();

    // Kiểm tra nếu chưa đăng nhập, chuyển hướng về trang login
    if (!user || !hasValidToken) {
        return <Navigate to="/login" replace />;
    }

    if (children) {
        return <>{children}</>;
    }

    return <Outlet />;
};
export default ProtectedRoute;