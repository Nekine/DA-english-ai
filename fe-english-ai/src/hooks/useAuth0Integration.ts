import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/authService';

interface Auth0User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * Custom hook để tích hợp Auth0 với hệ thống authentication local
 * Tự động sync user từ Auth0 vào database và AuthContext
 */
export const useAuth0Integration = () => {
  const { isAuthenticated, user: auth0User, isLoading, error, logout: auth0Logout } = useAuth0();
  const { login, logout: localLogout, user: localUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const syncAuth0User = async () => {
      if (isAuthenticated && auth0User && !localUser) {
        try {
          const typedAuth0User = auth0User as Auth0User;
          
          // Extract provider and providerId from Auth0 sub
          // Format: "google-oauth2|123456789" or "facebook|123456789"
          const provider = typedAuth0User.sub?.split('|')[0] || '';
          const providerId = typedAuth0User.sub?.split('|')[1] || '';
          
          // Determine provider type
          let providerType: 'google' | 'facebook' = 'google';
          if (provider.includes('google')) {
            providerType = 'google';
          } else if (provider.includes('facebook')) {
            providerType = 'facebook';
          }

          console.log('OAuth Login:', { provider: providerType, providerId, email: typedAuth0User.email });

          // Call backend OAuth login API
          const response = await authService.oauthLogin({
            provider: providerType,
            providerId: providerId,
            email: typedAuth0User.email || '',
            fullName: typedAuth0User.name,
            avatar: typedAuth0User.picture,
          });

          if (response.success && response.user) {
            // Login successful, update local auth state
            login(response.user);
            toast({
              title: "Đăng nhập thành công",
              description: `Chào mừng ${response.user.fullName || response.user.email}!`,
              variant: "default",
            });
          } else {
            throw new Error(response.message || 'OAuth login failed');
          }
        } catch (error: any) {
          console.error('Error syncing Auth0 user:', error);
          toast({
            title: "Lỗi đăng nhập",
            description: error.message || "Không thể đăng nhập với tài khoản này",
            variant: "destructive",
          });
          // Logout from Auth0 if sync fails
          auth0Logout({ logoutParams: { returnTo: window.location.origin } });
        }
      }
    };

    syncAuth0User();
  }, [isAuthenticated, auth0User, localUser, login, toast, auth0Logout]);

  // Xử lý lỗi Auth0
  useEffect(() => {
    if (error) {
      console.error('Auth0 error:', error);
      toast({
        title: "Lỗi xác thực",
        description: error.message || "Đã xảy ra lỗi trong quá trình xác thực",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Hàm logout tích hợp (logout cả Auth0 và local)
  const handleLogout = async () => {
    try {
      localLogout();
      if (isAuthenticated) {
        await auth0Logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Lỗi đăng xuất",
        description: "Không thể đăng xuất hoàn toàn",
        variant: "destructive",
      });
    }
  };

  return {
    isLoading,
    isAuthenticated,
    auth0User,
    localUser,
    handleLogout,
    error,
  };
};
