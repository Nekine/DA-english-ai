import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';
import { authService } from '@/services/authService';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const hasValidToken = authService.isAuthenticated();

  // Kiểm tra nếu user chưa đăng nhập
  if (!user || !hasValidToken) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;