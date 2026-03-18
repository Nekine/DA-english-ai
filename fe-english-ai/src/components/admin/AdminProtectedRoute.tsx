import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();

  // 🚧 FRONTEND TESTING MODE: Bypass authentication for FE testing
  // TODO: Enable authentication when backend is ready
  const FRONTEND_TESTING = true; // Set to false when backend auth is implemented

  if (FRONTEND_TESTING) {
    console.log('🔓 Admin access granted for Frontend testing (no backend auth required)');
    return <>{children}</>;
  }

  // Kiểm tra nếu user chưa đăng nhập
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra quyền admin - có thể customize logic này
  // Ví dụ: kiểm tra role, email domain, hoặc một field đặc biệt
  const isAdmin = user.email === 'admin@example.com' || 
                  user.tendangnhap === 'Admin' ||
                  user.email?.includes('admin') ||
                  // Thêm logic kiểm tra admin khác tùy theo yêu cầu
                  user.id === 1;

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;