import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';

/**
 * Auth0 Callback Page
 * Trang này xử lý redirect sau khi user đăng nhập thành công từ Auth0
 * và gửi thông tin user về backend để lưu vào database
 */
const Auth0Callback: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error } = useAuth0();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Đợi Auth0 hoàn tất quá trình authentication
      if (isLoading || isProcessing) return;

      if (isAuthenticated && user) {
        try {
          setIsProcessing(true);

          // Xác định provider (google hoặc facebook)
          const provider = user.sub?.startsWith('google-oauth2') ? 'google' : 
                          user.sub?.startsWith('facebook') ? 'facebook' : '';

          if (!provider) {
            throw new Error('Unknown OAuth provider');
          }

          // Extract provider ID từ sub (format: "provider|id")
          const providerId = user.sub?.split('|')[1] || '';

          // Gọi backend API để lưu/cập nhật user info
          const response = await authService.oauthLogin({
            provider: provider as 'google' | 'facebook',
            providerId: providerId,
            email: user.email || '',
            fullName: user.name || user.nickname || '',
            avatar: user.picture || '',
          });

          if (response.success) {
            toast({
              title: 'Đăng nhập thành công!',
              description: `Chào mừng ${response.user?.fullName || response.user?.email}!`,
              variant: 'default',
            });

            // Redirect về trang chủ
            navigate('/index', { replace: true });
          } else {
            throw new Error(response.message || 'OAuth login failed');
          }

        } catch (err: unknown) {
          console.error('Auth0 callback error:', err);
          
          const errorMessage = err instanceof Error ? err.message : 'Không thể hoàn tất đăng nhập';
          
          toast({
            title: 'Lỗi đăng nhập',
            description: errorMessage,
            variant: 'destructive',
          });

          // Redirect về trang login
          setTimeout(() => navigate('/login', { replace: true }), 2000);
        } finally {
          setIsProcessing(false);
        }

      } else if (error) {
        // Có lỗi xảy ra từ Auth0
        console.error('Auth0 authentication error:', error);
        
        toast({
          title: 'Lỗi xác thực',
          description: error.message || 'Đã xảy ra lỗi khi đăng nhập',
          variant: 'destructive',
        });

        // Redirect về trang login
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    handleAuthCallback();
  }, [isAuthenticated, isLoading, error, user, navigate, toast, isProcessing]);

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
          {isProcessing ? 'Đang xử lý thông tin...' : 'Đang xác thực...'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isProcessing ? 'Đang lưu thông tin người dùng...' : 'Vui lòng đợi trong giây lát'}
        </p>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"
          >
            <p className="text-sm">
              Đã xảy ra lỗi: {error.message}
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
