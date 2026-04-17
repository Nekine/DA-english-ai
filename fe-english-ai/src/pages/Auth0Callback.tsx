import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, type User } from '@/components/AuthContext';

/**
 * Google OAuth callback page.
 * Trang này nhận token và thông tin người dùng từ backend callback redirect.
 */
const Auth0Callback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const decodeBase64Url = (value: string): string => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return atob(padded);
  };

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const encodedUser = params.get('user');
        const oauthError = params.get('error');

        if (oauthError) {
          throw new Error(oauthError);
        }

        if (!token || !encodedUser) {
          throw new Error('Thiếu dữ liệu đăng nhập từ Google callback');
        }

        const parsedUser = JSON.parse(decodeBase64Url(encodedUser)) as User;

        localStorage.setItem('engace_token', token);
        localStorage.setItem('engace_user', JSON.stringify(parsedUser));
        localStorage.setItem('user', JSON.stringify(parsedUser));
        login(parsedUser);

        toast({
          title: 'Đăng nhập thành công!',
          description: `Chào mừng ${parsedUser.fullName || parsedUser.email}!`,
          variant: 'default',
        });

        const targetPath = parsedUser.role === 'admin' ? '/admin' : '/index';
        window.location.replace(targetPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể hoàn tất đăng nhập';
        setErrorMessage(message);

        toast({
          title: 'Lỗi đăng nhập',
          description: message,
          variant: 'destructive',
        });

        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    void handleGoogleCallback();
  }, [login, navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 dark:from-pink-950 dark:via-rose-950 dark:to-fuchsia-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="mb-6">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {errorMessage ? 'Đăng nhập thất bại' : 'Đang xác thực Google...'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {errorMessage ? 'Đang chuyển hướng về trang đăng nhập...' : 'Vui lòng đợi trong giây lát'}
        </p>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"
          >
            <p className="text-sm">
              Đã xảy ra lỗi: {errorMessage}
            </p>
            <p className="text-xs mt-2">
              Đang chuyển hướng về trang đăng nhập...
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth0Callback;
